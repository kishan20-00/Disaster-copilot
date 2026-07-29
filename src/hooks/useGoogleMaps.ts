import { useCallback, useEffect, useRef } from 'react';
import type { LatLng } from '@/services/geolocation';
import type { WalkingRoute } from '@/services/maps';
import { haversineMeters } from '@/services/maps';
import type { FamilyMember } from '@/lib/familyStore';
import type { MarkerIcon, MarkerState } from '@/lib/markerIcons';
import { poiMarkerIcon, userDotIcon } from '@/lib/markerIcons';

declare const google: any;

// Web-Mercator metres per pixel at zoom 0 on the equator (256px tiles).
const M_PER_PX_Z0 = 156543.03392;

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Stacking order for the POI pins: what you tapped sits above where you are
// being sent, which sits above the shelters, which sit above everything else.
// Without this the crowd overlaps by latitude and buries whichever pin matters.
const zIndexFor = (category: string, state: MarkerState): number =>
  state === 'active' ? 40 : state === 'target' ? 30 : category === 'shelter' ? 12 : 10;

export interface UseGoogleMapsParams {
  dynamicMarkers: any[];
  /** Id of the tapped POI, so its pin can be lifted out of the crowd. */
  activeMarker: string | null;
  mapLayer: string;
  currentStep: number;
  /** False for shelter-in-place hazards — no line should invite going outside. */
  routingEnabled: boolean;
  /** Set when examining a searched place; drawn separately from the GPS dot. */
  focusPosition: LatLng | null;
  /** Places the user recorded for family members. Drawn where they actually are. */
  family: FamilyMember[];
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
  dynamicMarkers, activeMarker, mapLayer, currentStep, routingEnabled, focusPosition, family, user,
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
  // POI pins by id, so selection can restyle a single pin. Re-creating the
  // markers instead would detach the InfoWindow from the pin it is anchored to
  // and the popup would blink out on the very tap that opened it.
  const poiMarkersRef = useRef<Map<string, { marker: any; category: string; isTarget: boolean; state: MarkerState }>>(new Map());
  const activeMarkerRef = useRef<string | null>(null);
  const userMarkerRef = useRef<any>(null);

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

  // Marker artwork is authored as plain numbers in lib/markerIcons so it stays
  // testable without the Maps SDK; this is the only place it meets google.maps.
  const toGoogleIcon = useCallback((icon: MarkerIcon) => ({
    url: icon.url,
    scaledSize: new google.maps.Size(icon.width, icon.height),
    anchor: new google.maps.Point(icon.anchorX, icon.anchorY)
  }), []);

  // Re-skin the POI pins for the current selection, touching only the two that
  // actually changed. The pins keep their identity, so an open InfoWindow stays
  // anchored where it is.
  const paintPoiIcons = useCallback(() => {
    poiMarkersRef.current.forEach((entry, id) => {
      const state: MarkerState =
        id === activeMarkerRef.current ? 'active' : entry.isTarget ? 'target' : 'default';
      if (state === entry.state) return;
      entry.state = state;
      entry.marker.setIcon(toGoogleIcon(poiMarkerIcon(entry.category, state)));
      // Selection floats above the target pulse, which floats above the crowd.
      entry.marker.setZIndex(zIndexFor(entry.category, state));
    });
  }, [toGoogleIcon]);

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
        isFractionalZoomEnabled: true
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
    poiMarkersRef.current.clear();

    // 3. Create current category & search-filtered markers (real Google Places)
    const markersToDraw = dynamicMarkers;

    markersToDraw.forEach((markerData: any) => {
      // The shelter the route is heading for, matched by position: the chosen
      // shelter can come from the official GSI register, which carries its own
      // ids, so the same site would never match this list by id.
      const isTarget =
        !!liveShelter &&
        Number.isFinite(markerData.lat) &&
        Number.isFinite(markerData.lng) &&
        haversineMeters(
          { lat: markerData.lat, lng: markerData.lng },
          { lat: liveShelter.lat, lng: liveShelter.lng }
        ) < 30;
      const state: MarkerState = isTarget ? 'target' : 'default';

      const marker = new google.maps.Marker({
        position: { lat: markerData.lat, lng: markerData.lng },
        map: mapInstanceRef.current,
        icon: toGoogleIcon(poiMarkerIcon(markerData.category, state)),
        title: markerData.name,
        zIndex: zIndexFor(markerData.category, state),
        // Optimised markers are painted onto one shared canvas, which flattens
        // the pulse on the target pin and softens the artwork on retina. A few
        // dozen DOM pins is a price worth paying; the icons themselves are
        // deduplicated by the browser since each state has one fixed data URI.
        optimized: false
      });

      poiMarkersRef.current.set(markerData.id, { marker, category: markerData.category, isTarget, state });

      marker.addListener('click', () => {
        setActiveMarker(markerData.id);

        if (infoWindowRef.current) {
          const contentString = `
            <div style="font-family: system-ui, -apple-system, sans-serif; padding: 10px 14px; max-width: 240px; background: #ffffff; color: #0f172a; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.15);">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <span style="font-size: 15px; display: inline-block;">
                  ${markerData.category === 'shelter' ? '🏥' : markerData.category === 'water' ? '⛲' : markerData.category === 'medical' ? '🩹' : '🚉'}
                </span>
                <strong style="font-size: 12.5px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 800;">${markerData.name}</strong>
              </div>
              <p style="margin: 0; font-size: 10px; color: #64748b; line-height: 1.5; font-family: monospace;">${markerData.desc}</p>
            </div>
          `;
          infoWindowRef.current.setContent(contentString);
          infoWindowRef.current.open(mapInstanceRef.current, marker);
        }
      });

      googleMarkersRef.current.push(marker);
    });

    // A Places refetch fires on every pan, so the pins are rebuilt constantly.
    // Re-apply the selection afterwards or the highlight would silently drop
    // off the pin whose popup is still open.
    paintPoiIcons();

    // 4. Current user position (blue core, white ring, slow sonar pulse).
    // Moved rather than rebuilt, and kept out of googleMarkersRef, because the
    // block above wipes that list on every Places refetch — i.e. on every pan —
    // and a recreated marker would restart the pulse each time.
    const userPos = livePosition;
    if (userPos) {
      if (!userMarkerRef.current) {
        userMarkerRef.current = new google.maps.Marker({
          map: mapInstanceRef.current,
          icon: toGoogleIcon(userDotIcon()),
          title: "Your Position",
          // Whatever else is on the map, "you" stays on top.
          zIndex: 60,
          optimized: false
        });
      }
      userMarkerRef.current.setPosition(userPos);
      userMarkerRef.current.setMap(mapInstanceRef.current);
    } else if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
    }

    // 4a. The place being examined, if it is not where the user is standing.
    // A separate amber ring, never a second blue dot: the blue dot means "you",
    // and moving or duplicating it would misrepresent where the device is.
    if (focusPosition) {
      const focusMarker = new google.maps.Marker({
        position: focusPosition,
        map: mapInstanceRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#f59e0b',
          fillOpacity: 0.25,
          strokeColor: '#f59e0b',
          strokeWeight: 2.5
        },
        title: 'Place being checked (not your location)',
        zIndex: 5
      });
      googleMarkersRef.current.push(focusMarker);
    }

    // 4b. Family places the user recorded. These were previously fixed offsets
    // from the user's own position, so three invented relatives trailed them
    // around at a constant distance forever.
    family.forEach((member) => {
      const pin = new google.maps.Marker({
        position: { lat: member.place.lat, lng: member.place.lng },
        map: mapInstanceRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 5,
          fillColor: '#a78bfa',
          fillOpacity: 0.9,
          strokeColor: '#0d1117',
          strokeWeight: 1.5
        },
        title: `${member.name} — expected at ${member.place.name}`
      });
      googleMarkersRef.current.push(pin);
    });

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

    if (routingEnabled) {
      // Prefer the REAL Google Directions polyline; fall back to a straight line to the shelter.
      //
      // The origin is the place being ASSESSED, not the device. Using livePosition
      // here drew the fallback line from the user's own address to a shelter beside
      // the searched place, and fitBounds then framed both — which snapped the
      // camera back home the moment an alert was triggered for somewhere else.
      const routeOrigin = focusPosition ?? livePosition;
      let pathCoords: { lat: number; lng: number }[] | null = null;
      const hasStreetRoute = !!(liveRoute && liveRoute.path.length > 1);
      if (hasStreetRoute) {
        pathCoords = liveRoute!.path;
      } else {
        const shelterData = liveShelter || dynamicMarkers.find((m: any) => m.category === 'shelter');
        if (shelterData && routeOrigin) {
          pathCoords = [routeOrigin, { lat: shelterData.lat, lng: shelterData.lng }];
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

  }, [googleMapsLoaded, dynamicMarkers, mapLayer, currentStep, routingEnabled, focusPosition, family, user, livePosition, liveRoute, liveShelter, publishCenter, cancelAnimation, setActiveMarker, toGoogleIcon, paintPoiIcons]);

  // Selection restyles pins in place. Deliberately kept out of the effect above:
  // that one rebuilds every marker, and rebuilding the pin an InfoWindow is
  // anchored to closes the popup the tap just opened.
  useEffect(() => {
    activeMarkerRef.current = activeMarker;
    paintPoiIcons();
  }, [activeMarker, paintPoiIcons]);

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

  // Force the map to re-measure its container and recentre. The map div is now
  // mounted once behind every tab (see App.tsx) rather than inside the Navigate
  // branch, so returning to Navigate can reveal a container that was laid out
  // while hidden. Google Maps caches the viewport size and paints black tiles
  // until told the box changed — this nudge (same trigger used at first init)
  // makes it repaint at the correct size. Idempotent and safe to call anytime.
  const refresh = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || typeof google === 'undefined' || !google.maps) return;
    google.maps.event.trigger(map, 'resize');
    const center = livePosition ?? publishedCenterRef.current;
    if (center) map.setCenter(center);
  }, [livePosition]);

  return { mapRef, recenter, panTo, refresh };
}
