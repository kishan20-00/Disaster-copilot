import { useCallback, useEffect, useRef } from 'react';
import type { LatLng } from '@/services/geolocation';
import type { WalkingRoute } from '@/services/maps';
import { haversineMeters } from '@/services/maps';
import { FAMILY_MEMBERS } from '@/constants/family';

declare const google: any;

// Web-Mercator metres per pixel at zoom 0 on the equator (256px tiles).
const M_PER_PX_Z0 = 156543.03392;

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export interface UseGoogleMapsParams {
  dynamicMarkers: any[];
  mapLayer: string;
  currentStep: number;
  user: unknown;
  livePosition: LatLng | null;
  liveRoute: WalkingRoute | null;
  liveShelter: { name: string; distanceMeters: number; lat: number; lng: number } | null;
  googleMapsLoaded: boolean;
  setGoogleMapsLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  setMapCenter: React.Dispatch<React.SetStateAction<{ lat: number; lng: number } | null>>;
  setActiveMarker: React.Dispatch<React.SetStateAction<string | null>>;
}

// Loads the Google Maps script and manages the live map instance: markers
// (POIs + user + family), route polyline, traffic/type layers, and centering.
export function useGoogleMaps({
  dynamicMarkers, mapLayer, currentStep, user,
  livePosition, liveRoute, liveShelter, googleMapsLoaded,
  setGoogleMapsLoaded, setMapCenter, setActiveMarker
}: UseGoogleMapsParams) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const googleMarkersRef = useRef<any[]>([]);
  const routePolylineRef = useRef<any>(null);
  const trafficLayerRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const gpsCenteredRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);
  const publishedCenterRef = useRef<LatLng | null>(null);
  const fittedRouteKeyRef = useRef<string | null>(null);

  // Publish a settled map centre upward (drives the nearby-Places search).
  // Deduped, because every publish costs a Places round-trip per category.
  const publishCenter = useCallback((pos: LatLng) => {
    const last = publishedCenterRef.current;
    if (last && Math.abs(last.lat - pos.lat) < 1e-6 && Math.abs(last.lng - pos.lng) < 1e-6) return;
    publishedCenterRef.current = pos;
    setMapCenter(pos);
  }, [setMapCenter]);

  const cancelAnimation = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    isAnimatingRef.current = false;
  }, []);

  // Smoothly fly the camera to a target instead of teleporting.
  //
  // google.maps' own panTo() only animates when the target is roughly on-screen
  // and silently jumps otherwise, and a setZoom() right after it kills whatever
  // animation did start — that combination is what made the map blank out and
  // reappear. So we drive the camera ourselves frame by frame.
  //
  // Long hops also dip the zoom out mid-flight and come back in; sliding across
  // a city at zoom 16 would drag thousands of tiles through the viewport.
  const flyTo = useCallback((target: LatLng, targetZoom: number) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    cancelAnimation();

    const startCenter = map.getCenter?.();
    const startZoom = map.getZoom?.() ?? targetZoom;
    const applyCamera = (center: LatLng, zoom: number) => {
      if (typeof map.moveCamera === 'function') {
        map.moveCamera({ center, zoom });
      } else {
        map.setCenter(center);
        map.setZoom(zoom);
      }
    };

    if (!startCenter) {
      applyCamera(target, targetZoom);
      publishCenter(target);
      return;
    }

    const start = { lat: startCenter.lat(), lng: startCenter.lng() };

    // Take the short way round the antimeridian.
    let dLng = target.lng - start.lng;
    if (dLng > 180) dLng -= 360;
    if (dLng < -180) dLng += 360;

    const metres = haversineMeters(start, target);
    if (metres < 0.5 && Math.abs(startZoom - targetZoom) < 0.01) {
      publishCenter(target);
      return;
    }

    // Zoom at which the whole journey would fit across the viewport.
    const viewportPx = mapRef.current?.clientWidth || 390;
    const spanZoom = metres > 1
      ? Math.log2((M_PER_PX_Z0 * Math.cos((start.lat * Math.PI) / 180) * viewportPx) / metres)
      : 22;
    const arcFloor = Math.max(2, Math.min(startZoom, targetZoom, spanZoom));
    const arcDepth = Math.max(0, Math.min(startZoom, targetZoom) - arcFloor);

    // Nearby nudges stay snappy; a cross-city hop earns a little more air time.
    const duration = Math.round(Math.min(1800, Math.max(500, 500 + arcDepth * 150)));

    isAnimatingRef.current = true;
    const t0 = performance.now();

    const frame = (now: number) => {
      const raw = Math.min(1, (now - t0) / duration);
      const eased = easeInOutCubic(raw);

      if (raw < 1) {
        applyCamera(
          {
            lat: start.lat + (target.lat - start.lat) * eased,
            // Left unnormalised on purpose: a monotonic longitude glides across
            // the antimeridian, and Maps wraps out-of-range values itself.
            lng: start.lng + dLng * eased
          },
          // Single symmetric hump: pull back, then settle in.
          startZoom + (targetZoom - startZoom) * eased - arcDepth * Math.sin(Math.PI * raw)
        );
        animFrameRef.current = requestAnimationFrame(frame);
        return;
      }

      // Land exactly on the target so no interpolation drift is left behind.
      animFrameRef.current = null;
      isAnimatingRef.current = false;
      applyCamera(target, targetZoom);
      publishCenter(target);
    };

    animFrameRef.current = requestAnimationFrame(frame);
  }, [cancelAnimation, publishCenter]);

  // Never leave a frame callback running after the map goes away.
  useEffect(() => cancelAnimation, [cancelAnimation]);

  // Dynamic Google Maps Script Loader
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
    if (!apiKey) {
      console.warn("VITE_GOOGLE_MAPS_API_KEY is not defined. Falling back to high-fidelity SVG interactive map mockup.");
      return;
    }

    if (typeof google !== 'undefined' && google.maps) {
      setGoogleMapsLoaded(true);
      return;
    }

    const existingScript = document.getElementById('google-maps-api-script');
    if (existingScript) {
      const handleLoad = () => setGoogleMapsLoaded(true);
      existingScript.addEventListener('load', handleLoad);
      return () => {
        existingScript.removeEventListener('load', handleLoad);
      };
    }

    const script = document.createElement('script');
    script.id = 'google-maps-api-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => {
      setGoogleMapsLoaded(true);
      console.log("Real Google Maps API successfully loaded.");
    });
    script.addEventListener('error', (e) => {
      console.error("Failed to load Google Maps API script.", e);
    });
    document.head.appendChild(script);
  }, [setGoogleMapsLoaded]);

  // Update real Google Map instance, center, markers, layers, and routes dynamically
  useEffect(() => {
    if (!googleMapsLoaded || !mapRef.current || typeof google === 'undefined' || !google.maps) return;

    // Everything is driven by the user's real GPS position.
    const center = livePosition ?? { lat: 0, lng: 0 };

    // 1. Initialize Map if not already created
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center: center,
        zoom: 15,
        disableDefaultUI: true,
        zoomControl: false,
        gestureHandling: "cooperative",
        // Raster maps round zoom to integers by default, which would make the
        // fly-to arc step visibly instead of gliding.
        isFractionalZoomEnabled: true,
        styles: [
          { elementType: "geometry", stylers: [{ color: "#0d1117" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#0d1117" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#58a6ff" }] },
          { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#30363d" }] },
          { featureType: "road", elementType: "geometry", stylers: [{ color: "#21262d" }] },
          { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#30363d" }] },
          { featureType: "water", elementType: "geometry", stylers: [{ color: "#090d16" }] }
        ]
      });

      // Unified InfoWindow instance
      infoWindowRef.current = new google.maps.InfoWindow();

      // Listen for map idle to update dynamic query center coordinates.
      // Mid-flight frames are not a settled centre, so they are ignored.
      mapInstanceRef.current.addListener('idle', () => {
        if (isAnimatingRef.current) return;
        const currentCenter = mapInstanceRef.current.getCenter();
        if (currentCenter) {
          publishCenter({ lat: currentCenter.lat(), lng: currentCenter.lng() });
        }
      });

      // A user gesture always wins over an in-flight camera animation.
      mapInstanceRef.current.addListener('dragstart', cancelAnimation);

      // Clear selection on clicking map
      mapInstanceRef.current.addListener('click', () => {
        if (infoWindowRef.current) {
          infoWindowRef.current.close();
        }
        setActiveMarker(null);
      });

      // Force Google Maps to recalculate container boundaries and center after the DOM paints
      setTimeout(() => {
        if (mapInstanceRef.current) {
          google.maps.event.trigger(mapInstanceRef.current, 'resize');
          mapInstanceRef.current.setCenter(center);
          publishCenter(center);
        }
      }, 150);
    }

    // Pan to real GPS position the first time it resolves after sign-in.
    // This runs once — ward detection is async and may fail, so don't wait for it.
    if (livePosition && !gpsCenteredRef.current && mapInstanceRef.current) {
      gpsCenteredRef.current = true;
      mapInstanceRef.current.setCenter(livePosition);
      mapInstanceRef.current.setZoom(16);
      publishCenter(livePosition);
    }

    // 2. Clear existing Google Map markers
    googleMarkersRef.current.forEach(m => m.setMap(null));
    googleMarkersRef.current = [];

    // 3. Create current category & search-filtered markers (real Google Places)
    const markersToDraw = dynamicMarkers;

    markersToDraw.forEach((markerData: any) => {
      const color = {
        shelter: '#10b981',
        water: '#0ea5e9',
        medical: '#a855f7',
        station: '#f59e0b'
      }[markerData.category as 'shelter' | 'water' | 'medical' | 'station'] || '#38bdf8';

      // SVG path custom pin symbol for Google Maps
      const pinSymbol = {
        path: 'M 0 8 C -5 2, -7.5 -3, -7.5 -9 C -7.5 -16, -4 -20, 0 -20 C 4 -20, 7.5 -16, 7.5 -9 C 7.5 -3, 5 2, 0 8 Z',
        fillColor: color,
        fillOpacity: 1,
        strokeColor: '#0d1117',
        strokeWeight: 1.5,
        scale: 1.2,
        anchor: new google.maps.Point(0, 8),
      };

      const marker = new google.maps.Marker({
        position: { lat: markerData.lat, lng: markerData.lng },
        map: mapInstanceRef.current,
        icon: pinSymbol,
        title: markerData.name
      });

      marker.addListener('click', () => {
        setActiveMarker(markerData.id);

        if (infoWindowRef.current) {
          const contentString = `
            <div style="font-family: system-ui, -apple-system, sans-serif; padding: 10px 14px; max-width: 240px; background: #0f172a; color: #f1f5f9; border-radius: 12px; border: 1px solid #1e293b; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <span style="font-size: 15px; display: inline-block;">
                  ${markerData.category === 'shelter' ? '🏥' : markerData.category === 'water' ? '⛲' : markerData.category === 'medical' ? '🩹' : '🚉'}
                </span>
                <strong style="font-size: 12.5px; color: #ffffff; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 800;">${markerData.name}</strong>
              </div>
              <p style="margin: 0; font-size: 10px; color: #94a3b8; line-height: 1.5; font-family: monospace;">${markerData.desc}</p>
            </div>
          `;
          infoWindowRef.current.setContent(contentString);
          infoWindowRef.current.open(mapInstanceRef.current, marker);
        }
      });

      googleMarkersRef.current.push(marker);
    });

    // 4. Place current user position pin (Blue pulsing core dot)
    const userPos = livePosition;
    if (userPos) {
      const userMarker = new google.maps.Marker({
        position: userPos,
        map: mapInstanceRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: '#2563eb',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 1.5
        },
        title: "Your Position"
      });
      googleMarkersRef.current.push(userMarker);
    }

    // 4b. Family member position pins — small offsets from the user's live position.
    if (livePosition) {
      FAMILY_MEMBERS.forEach(member => {
        const pin = new google.maps.Marker({
          position: { lat: livePosition.lat + member.dLat, lng: livePosition.lng + member.dLng },
          map: mapInstanceRef.current,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 5,
            fillColor: member.color,
            fillOpacity: 0.9,
            strokeColor: '#0d1117',
            strokeWeight: 1.5
          },
          title: member.name
        });
        googleMarkersRef.current.push(pin);
      });
    }

    // 5. Render live real-time Traffic layer if traffic view is requested
    if (trafficLayerRef.current) {
      trafficLayerRef.current.setMap(null);
      trafficLayerRef.current = null;
    }
    if (mapLayer === 'traffic') {
      trafficLayerRef.current = new google.maps.TrafficLayer();
      trafficLayerRef.current.setMap(mapInstanceRef.current);
    }

    // 6. Set Map Type (satellite vs roadmap)
    if (mapLayer === 'satellite') {
      mapInstanceRef.current.setMapTypeId('satellite');
    } else {
      mapInstanceRef.current.setMapTypeId('roadmap');
    }

    // 7. Render dynamic Evacuation Polyline if active alert simulation is running
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
      routePolylineRef.current = null;
    }

    if (currentStep >= 0) {
      // Prefer the REAL Google Directions polyline; fall back to a straight line to the shelter.
      let pathCoords: { lat: number; lng: number }[] | null = null;
      const hasStreetRoute = !!(liveRoute && liveRoute.path.length > 1);
      if (hasStreetRoute) {
        pathCoords = liveRoute!.path;
      } else {
        const shelterData = liveShelter || dynamicMarkers.find((m: any) => m.category === 'shelter');
        if (shelterData && userPos) {
          pathCoords = [userPos, { lat: shelterData.lat, lng: shelterData.lng }];
        }
      }

      if (pathCoords && pathCoords.length) {
        routePolylineRef.current = new google.maps.Polyline({
          path: pathCoords,
          geodesic: true,
          strokeColor: '#10b981',
          // A solid line means "walk this". Without street directions all we
          // have is a bearing, so draw it as dots — it must never read as a
          // walkable path running through buildings.
          strokeOpacity: hasStreetRoute ? 0.85 : 0,
          strokeWeight: hasStreetRoute ? 5 : 3,
          ...(hasStreetRoute ? {} : {
            icons: [{
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 2.5,
                fillColor: '#10b981',
                fillOpacity: 0.9,
                strokeOpacity: 0
              },
              offset: '0',
              repeat: '12px'
            }]
          }),
          map: mapInstanceRef.current
        });

        // Frame the route once, when it first appears. This effect re-runs on
        // every Places refetch (each pan produces a fresh markers array), and
        // re-fitting each time would fight recenter, search flights, and the
        // user's own panning.
        const first = pathCoords[0];
        const last = pathCoords[pathCoords.length - 1];
        const routeKey = `${pathCoords.length}:${first.lat.toFixed(5)},${first.lng.toFixed(5)}>${last.lat.toFixed(5)},${last.lng.toFixed(5)}`;
        if (fittedRouteKeyRef.current !== routeKey && !isAnimatingRef.current) {
          fittedRouteKeyRef.current = routeKey;
          const bounds = new google.maps.LatLngBounds();
          pathCoords.forEach((coord) => bounds.extend(coord));
          mapInstanceRef.current.fitBounds(bounds);
        }
      }
    } else {
      // Stood down — let the next alert's route frame itself again.
      fittedRouteKeyRef.current = null;
    }

  }, [googleMapsLoaded, dynamicMarkers, mapLayer, currentStep, user, livePosition, liveRoute, liveShelter, publishCenter, cancelAnimation, setActiveMarker]);

  // Recenter the map on the user's live GPS position (used by the recenter
  // button). An explicit flight — bypasses the one-shot gpsCenteredRef so it
  // works however far the user has panned away.
  const recenter = useCallback(() => {
    if (livePosition) flyTo(livePosition, 16);
  }, [flyTo, livePosition]);

  // Fly the map to an arbitrary position (used by the search box). The centre is
  // published when the flight lands, which re-runs the nearby-Places search.
  const panTo = useCallback((pos: LatLng) => {
    flyTo(pos, 15);
  }, [flyTo]);

  return { mapRef, recenter, panTo };
}
