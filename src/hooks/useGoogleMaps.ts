import { useEffect, useRef } from 'react';
import type { LatLng } from '@/services/geolocation';
import { getCityFallback } from '@/services/geolocation';
import type { WalkingRoute } from '@/services/maps';
import { locationMarkers } from '@/constants/locationMarkers';
import { FAMILY_MEMBERS } from '@/constants/family';

declare const google: any;

export interface UseGoogleMapsParams {
  location: 'Shibuya' | 'Minato' | 'Shinjuku';
  dynamicMarkers: any[];
  mapLayer: string;
  currentStep: number;
  user: unknown;
  isBypassed: boolean;
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
  location, dynamicMarkers, mapLayer, currentStep, user, isBypassed,
  livePosition, liveRoute, liveShelter, googleMapsLoaded,
  setGoogleMapsLoaded, setMapCenter, setActiveMarker
}: UseGoogleMapsParams) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const googleMarkersRef = useRef<any[]>([]);
  const routePolylineRef = useRef<any>(null);
  const trafficLayerRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const lastLocationRef = useRef<string>('');
  const gpsCenteredRef = useRef(false);

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

    const centers = {
      Shibuya: { lat: 35.658034, lng: 139.701630 },
      Minato: { lat: 35.658581, lng: 139.745433 },
      Shinjuku: { lat: 35.6895, lng: 139.6917 }
    };
    const center = centers[location] || centers.Shibuya;

    // 1. Initialize Map if not already created
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center: center,
        zoom: 15,
        disableDefaultUI: true,
        zoomControl: false,
        gestureHandling: "cooperative",
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

      // Listen for map idle to update dynamic query center coordinates
      mapInstanceRef.current.addListener('idle', () => {
        const currentCenter = mapInstanceRef.current.getCenter();
        if (currentCenter) {
          setMapCenter({ lat: currentCenter.lat(), lng: currentCenter.lng() });
        }
      });

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
          setMapCenter(center);
        }
      }, 150);
    }

    // Centering trigger when user swaps target municipalities in setup
    if (lastLocationRef.current !== location) {
      lastLocationRef.current = location;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setCenter(center);
        setMapCenter(center);
      }
    }

    // Pan to real GPS position the first time it resolves after sign-in.
    // This runs once — ward detection is async and may fail, so don't wait for it.
    if (livePosition && !gpsCenteredRef.current && mapInstanceRef.current) {
      gpsCenteredRef.current = true;
      mapInstanceRef.current.panTo(livePosition);
      mapInstanceRef.current.setZoom(16);
      setMapCenter(livePosition);
    }

    // 2. Clear existing Google Map markers
    googleMarkersRef.current.forEach(m => m.setMap(null));
    googleMarkersRef.current = [];

    // 3. Create current category & search-filtered markers
    const markersToDraw = googleMapsLoaded ? dynamicMarkers : (locationMarkers[location] || []);

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
    const userPos = livePosition ?? getCityFallback(location);
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

    // 4b. Family member position pins (Safety Guard Dashboard)
    FAMILY_MEMBERS.forEach(member => {
      const pin = new google.maps.Marker({
        position: { lat: member.lat, lng: member.lng },
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
      if (liveRoute && liveRoute.path.length > 1) {
        pathCoords = liveRoute.path;
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
          strokeOpacity: 0.85,
          strokeWeight: 5,
          map: mapInstanceRef.current
        });
        const bounds = new google.maps.LatLngBounds();
        pathCoords.forEach((coord) => bounds.extend(coord));
        mapInstanceRef.current.fitBounds(bounds);
      }
    }

  }, [googleMapsLoaded, location, dynamicMarkers, mapLayer, currentStep, user, isBypassed, livePosition, liveRoute, liveShelter, setMapCenter, setActiveMarker]);

  return { mapRef };
}
