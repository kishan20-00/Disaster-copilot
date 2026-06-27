import { useState, useEffect, useRef } from 'react';
import {
  generateActionSteps,
  generateSmsDraft,
  isGeminiConfigured,
  runCommanderAgent,
  runPersonalAgent,
  runRouteAgent,
  runSituationAgent,
  runTranslateAgent
} from './services/gemini';
import type { ActionStep, HazardSignal } from './services/gemini';
import { fetchHazardSignal } from './services/jma';
import { getCityFallback, requestUserPosition } from './services/geolocation';
import type { LatLng } from './services/geolocation';
import { findNearestShelter, getWalkingRoute, reverseGeocode } from './services/maps';
import type { WalkingRoute } from './services/maps';
import {
  Shield,
  Activity,
  Users,
  Send,
  Check,
  X,
  AlertTriangle,
  Play,
  RotateCcw,
  Smartphone,
  Compass,
  CheckCircle2,
  MessageSquare,
  MapPin,
  ArrowRight,
  Unlock,
  LogOut,
  Fingerprint,
  User,
  ChevronUp,
  ChevronDown,
  Layers,
  Navigation,
  Mic,
  MicOff,
  Search
} from 'lucide-react';

// Global declaration for Google Identity Services script
declare const google: any;

// Define TS interfaces for our state
interface AgentState {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'running' | 'completed';
  result: string;
}

interface PersonalContext {
  language: 'English' | 'Chinese' | 'Vietnamese' | 'Japanese';
  location: 'Shibuya' | 'Minato' | 'Shinjuku';
  floor: '9th Floor' | 'Ground Floor' | 'Basement';
  companions: 'Traveling Solo' | 'With a Child' | 'With Elderly Parents';
  mobility: 'Fully Mobile' | 'Wheelchair User';
}

const LANGUAGES_MAP = {
  English: {
    welcome: "Peace of Mind",
    trigger: "Trigger Alert Replay",
    approving: "Human-in-the-Loop Gate",
    instructions: "DO THIS NOW",
    familyMsg: "Draft Emergency Message",
    sent: "Emergency SMS Dispatched!",
    analyzing: "Co-pilot reasoning in progress..."
  },
  Chinese: {
    welcome: "安心保驾",
    trigger: "触发警报回放",
    approving: "人工审批网关",
    instructions: "立即执行以下操作",
    familyMsg: "紧急求助短信草稿",
    sent: "紧急求助短信已发送！",
    analyzing: "副驾驶智能推理中..."
  },
  Vietnamese: {
    welcome: "An Tâm Tuyệt Đối",
    trigger: "Kích Hoạt Kịch Bản",
    approving: "Cổng Phê Duyệt Nhân Sự",
    instructions: "HÀNH ĐỘNG NGAY",
    familyMsg: "Bản Nháp Tin Nhắn Khẩn Cấp",
    sent: "Tin nhắn khẩn cấp đã được gửi!",
    analyzing: "Trợ lý ảo đang phân tích tình huống..."
  },
  Japanese: {
    welcome: "安心・安全",
    trigger: "デモアラート起動",
    approving: "ヒューマン・ゲートウェイ",
    instructions: "今すぐ実行すべき行動",
    familyMsg: "緊急連絡メッセージ案",
    sent: "緊急メッセージを送信しました！",
    analyzing: "コパイロットが推論しています..."
  }
};

const locationMarkers = {
  Shibuya: [
    { 
      id: 'shibuya-shelter', 
      category: 'shelter', 
      name: 'Miyashita Park Shelter', 
      shortName: 'Miyashita Park',
      shortNameJa: '宮下公園',
      shortNameZh: '宫下公园',
      shortNameVi: 'Công viên Miyashita',
      distance: '400m',
      detailDesc: 'Open, elevated shelter, 400m, ADA compliant path available',
      x: 252, y: 345, 
      lat: 35.6617, lng: 139.7020, 
      desc: 'Elevated open-air park. Capacity: 5,000. ADA Access verified.' 
    },
    { 
      id: 'shibuya-shelter-2', 
      category: 'shelter', 
      name: 'Yoyogi Gym Refuge', 
      shortName: 'Yoyogi Gym',
      shortNameJa: '代々木体育館',
      shortNameZh: '代代木体育馆',
      shortNameVi: 'Nhà thi đấu Yoyogi',
      distance: '750m',
      detailDesc: 'Indoor heavy structure, 750m',
      x: 50, y: 150, 
      lat: 35.6631, lng: 139.6975, 
      desc: 'Reinforced seismic dome structure. Capacity: 10,000.' 
    },
    { 
      id: 'shibuya-shelter-3', 
      category: 'shelter', 
      name: 'Jingu-mae Shelter', 
      shortName: 'Jingu-mae Shelter',
      shortNameJa: '神宮前避難所',
      shortNameZh: '神宫前避难所',
      shortNameVi: 'Khu trú ẩn Jingu-mae',
      distance: '620m',
      detailDesc: 'Outdoor park space, 620m',
      x: 310, y: 450, 
      lat: 35.6590, lng: 139.7060, 
      desc: 'Local community assembly ground. Basic emergency kit.' 
    },
    { id: 'shibuya-water', category: 'water', name: 'Shibuya Well Station', x: 120, y: 320, lat: 35.6585, lng: 139.6975, desc: 'Solar-powered ground aquifer water tap. Active.' },
    { id: 'shibuya-water-2', category: 'water', name: 'South Shibuya Supply Gate', x: 200, y: 600, lat: 35.6545, lng: 139.7010, desc: 'Backup underground municipal water cistern. High volume.' },
    { id: 'shibuya-water-3', category: 'water', name: 'Harajuku Reservoir Node', x: 80, y: 220, lat: 35.6610, lng: 139.6950, desc: 'Clean gravity-fed fresh-water distribution post.' },
    { id: 'shibuya-medical', category: 'medical', name: 'Shibuya Triage Center', x: 280, y: 550, lat: 35.6558, lng: 139.7040, desc: 'First aid, blankets, and local network routing.' },
    { id: 'shibuya-medical-2', category: 'medical', name: 'Shibuya West Clinic Outpost', x: 160, y: 380, lat: 35.6598, lng: 139.6990, desc: 'Volunteer physician group. Wound care & basic triage.' },
    { id: 'shibuya-hazard', category: 'hazard', name: 'Fallen Glass Hazard', x: 100, y: 450, lat: 35.6575, lng: 139.6995, desc: 'Shattered facade glass. Blocked road.' },
    { id: 'shibuya-hazard-2', category: 'hazard', name: 'Fallen Signage Blockage', x: 220, y: 280, lat: 35.6630, lng: 139.7035, desc: 'Commercial steel sign fallen across pedestrian path.' }
  ],
  Minato: [
    { 
      id: 'minato-shelter', 
      category: 'shelter', 
      name: 'Shiba Park Shelter', 
      shortName: 'Shiba Park',
      shortNameJa: '芝公園',
      shortNameZh: '芝公园',
      shortNameVi: 'Công viên Shiba',
      distance: '650m',
      detailDesc: 'Open, 650m',
      x: 210, y: 390, 
      lat: 35.6556, lng: 139.7483, 
      desc: 'Large open-ground shelter near Tokyo Tower. Capacity: 8,000.' 
    },
    { 
      id: 'minato-shelter-2', 
      category: 'shelter', 
      name: 'Akasaka Sacas Refuge', 
      shortName: 'Akasaka Sacas',
      shortNameJa: '赤坂サカス',
      shortNameZh: '赤坂Sacas',
      shortNameVi: 'Refuge Akasaka Sacas',
      distance: '900m',
      detailDesc: 'High concrete plaza, 900m',
      x: 80, y: 480, 
      lat: 35.6580, lng: 139.7350, 
      desc: 'High-elevation open concrete square. Tsunami resilient.' 
    },
    { 
      id: 'minato-shelter-3', 
      category: 'shelter', 
      name: 'Sports Center Refuge', 
      shortName: 'Sports Center',
      shortNameJa: '港区スポーツセンター',
      shortNameZh: '港区体育中心',
      shortNameVi: 'Trung tâm Thể thao',
      distance: '1.2km',
      detailDesc: 'Indoor shelter, 1.2km',
      x: 320, y: 320, 
      lat: 35.6515, lng: 139.7540, 
      desc: 'Emergency backup food, blankets, and blankets warehouse.' 
    },
    { id: 'minato-water', category: 'water', name: 'Tokyo Tower Water Reservoir', x: 100, y: 250, lat: 35.6586, lng: 139.7454, desc: 'Underground emergency fresh-water supply.' },
    { id: 'minato-water-2', category: 'water', name: 'Mita Water Reserve Gate', x: 260, y: 580, lat: 35.6495, lng: 139.7480, desc: 'Automated high-capacity groundwater pumping station.' },
    { id: 'minato-water-3', category: 'water', name: 'Roppongi Hills Water Point', x: 150, y: 420, lat: 35.6540, lng: 139.7410, desc: 'Earthquake-safe storage reservoir with manual distribution lines.' },
    { id: 'minato-medical', category: 'medical', name: 'Roppongi Medical Clinic', x: 290, y: 520, lat: 35.6620, lng: 139.7330, desc: 'Triage team active. Emergency generator operational.' },
    { id: 'minato-medical-2', category: 'medical', name: 'Toranomon First Aid Outpost', x: 180, y: 300, lat: 35.6595, lng: 139.7440, desc: 'Red Cross disaster caravan. Clean bandages and sutures.' },
    { id: 'minato-hazard', category: 'hazard', name: 'Structural Risk: Overpass', x: 150, y: 580, lat: 35.6530, lng: 139.7420, desc: 'Highway structural cracks. High risk area.' },
    { id: 'minato-hazard-2', category: 'hazard', name: 'Fallen Concrete Panel', x: 230, y: 200, lat: 35.6610, lng: 139.7490, desc: 'Masonry facade panel fallen onto active vehicle lane.' }
  ],
  Shinjuku: [
    { 
      id: 'shinjuku-shelter', 
      category: 'shelter', 
      name: 'Shinjuku Gyoen Shelter', 
      shortName: 'Shinjuku Gyoen',
      shortNameJa: '新宿御苑',
      shortNameZh: '新宿御苑',
      shortNameVi: 'Công viên Shinjuku Gyoen',
      distance: '800m',
      detailDesc: 'Open, 800m',
      x: 250, y: 490, 
      lat: 35.6852, lng: 139.7095, 
      desc: 'Massive open park refuge. Capacity: 25,000. Windbreak forest.' 
    },
    { 
      id: 'shinjuku-shelter-2', 
      category: 'shelter', 
      name: 'Shinjuku Chuo Park', 
      shortName: 'Chuo Park',
      shortNameJa: '新宿中央公園',
      shortNameZh: '新宿中央公园',
      shortNameVi: 'Công viên Shinjuku Chuo',
      distance: '950m',
      detailDesc: 'Open park, 950m',
      x: 120, y: 220, 
      lat: 35.6945, lng: 139.6910, 
      desc: 'Multi-level open park. Hydrant connections and local radio.' 
    },
    { 
      id: 'shinjuku-shelter-3', 
      category: 'shelter', 
      name: 'Toyama Park Shelter', 
      shortName: 'Toyama Park',
      shortNameJa: '戸山公園',
      shortNameZh: '户山公园',
      shortNameVi: 'Công viên Toyama',
      distance: '1.4km',
      detailDesc: 'Wooded park, 1.4km',
      x: 340, y: 400, 
      lat: 35.7010, lng: 139.7150, 
      desc: 'Hilly open-space refuge area. Stocked water storage.' 
    },
    { id: 'shinjuku-water', category: 'water', name: 'Gyoen Water Station', x: 300, y: 310, lat: 35.6880, lng: 139.7130, desc: 'Clean groundwater well with manual pumps.' },
    { id: 'shinjuku-water-2', category: 'water', name: 'West Shinjuku Supply Node', x: 80, y: 480, lat: 35.6870, lng: 139.6890, desc: 'Solar-powered smart municipal water tap station.' },
    { id: 'shinjuku-water-3', category: 'water', name: 'Kabukicho Well Station', x: 190, y: 150, lat: 35.6960, lng: 139.7010, desc: 'Deep-aquifer borehole well. Active under local generator power.' },
    { id: 'shinjuku-medical', category: 'medical', name: 'Shinjuku First Aid Tent', x: 110, y: 420, lat: 35.6895, lng: 139.6990, desc: 'Red Cross outpost. Medical supplies stocked.' },
    { id: 'shinjuku-medical-2', category: 'medical', name: 'Gyoen Gate Triage Station', x: 240, y: 580, lat: 35.6840, lng: 139.7110, desc: 'Mobile first aid clinic stationed near the Gyoen entrance.' },
    { id: 'shinjuku-hazard', category: 'hazard', name: 'Subway Flooding', x: 190, y: 200, lat: 35.6905, lng: 139.7040, desc: 'Underground tunnel ingress. Closed.' },
    { id: 'shinjuku-hazard-2', category: 'hazard', name: 'Gyoen Perimeter Slope Failure', x: 280, y: 450, lat: 35.6865, lng: 139.7125, desc: 'Slope landslide risk. Retaining brick wall collapsed.' }
  ]
};

// Helper to get shelter information dynamically without hardcoding
const getShelterInfo = (location: string, language: string, dynamicShelters?: any[]) => {
  const markers = (dynamicShelters && dynamicShelters.length > 0)
    ? dynamicShelters
    : (locationMarkers[location as keyof typeof locationMarkers] || []);
  const shelter = markers.find(m => m.category === 'shelter') as any;
  if (!shelter) {
    return { name: 'Emergency Shelter', distance: '400m', detail: 'Open shelter', fullName: 'Emergency Shelter', desc: '' };
  }

  let name = shelter.shortName || shelter.name;
  if (language === 'Japanese') name = shelter.shortNameJa || shelter.name;
  else if (language === 'Chinese') name = shelter.shortNameZh || shelter.name;
  else if (language === 'Vietnamese') name = shelter.shortNameVi || shelter.name;

  return {
    name: name || shelter.shortName || shelter.name,
    fullName: shelter.name,
    distance: shelter.distance || '350m',
    detail: shelter.detailDesc || shelter.desc || 'Designated Shelter',
    desc: shelter.desc
  };
};

// Helper to parse JWT from Google Identity Services token without external packages
function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Failed to parse JWT token", error);
    return null;
  }
}

export default function App() {
  // Authentication & Session States
  const [user, setUser] = useState<{ name: string; email: string; avatar?: string } | null>(null);
  const [isBypassed, setIsBypassed] = useState(false);
  const [authLoading, setAuthLoading] = useState<'none' | 'google' | 'biometric'>('none');
  const [showFaceIdModal, setShowFaceIdModal] = useState(false);
  const [faceIdState, setFaceIdState] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');

  // Demo configurations
  const [activeHazard, setActiveHazard] = useState<'earthquake' | 'typhoon' | 'tsunami'>('earthquake');
  const [personalContext, setPersonalContext] = useState<PersonalContext>({
    language: 'English',
    location: 'Shibuya',
    floor: '9th Floor',
    companions: 'With a Child',
    mobility: 'Fully Mobile'
  });

  // Simulation play state
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsStatus, setSmsStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  // Google Maps styles and interactive state
  const [mapLayer, setMapLayer] = useState<'streets' | 'satellite' | 'terrain' | 'traffic' | 'hazard'>('streets');
  const [filterCategory, setFilterCategory] = useState<'all' | 'shelter' | 'water' | 'medical' | 'station'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMarker, setActiveMarker] = useState<string | null>(null);
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);
  const [voiceAssistant, setVoiceAssistant] = useState(false);
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // Dynamic Google Places API States & Refs
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [dynamicMarkers, setDynamicMarkers] = useState<any[]>([]);
  const lastLocationRef = useRef<string>('');
  const infoWindowRef = useRef<any>(null);

  // Live, model-generated state (replaces hardcoded JMA bulletins, evac steps, SMS draft, user pin)
  const [hazardSignal, setHazardSignal] = useState<HazardSignal | null>(null);
  const [liveSteps, setLiveSteps] = useState<ActionStep[] | null>(null);
  const [liveSmsDraft, setLiveSmsDraft] = useState<string | null>(null);
  const [livePosition, setLivePosition] = useState<LatLng | null>(null);
  const [liveAddress, setLiveAddress] = useState<string | null>(null);
  const [liveRoute, setLiveRoute] = useState<WalkingRoute | null>(null);
  const [liveShelter, setLiveShelter] = useState<{ name: string; distanceMeters: number; lat: number; lng: number } | null>(null);
  const pipelineRunIdRef = useRef(0);

  // Real Google Maps API Integration States & Refs
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const googleMarkersRef = useRef<any[]>([]);
  const routePolylineRef = useRef<any>(null);
  const trafficLayerRef = useRef<any>(null);

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
  }, []);

  // Update real Google Map instance, center, markers, layers, and routes dynamically
  useEffect(() => {
    if (!googleMapsLoaded || !mapRef.current || typeof google === 'undefined' || !google.maps) return;

    const centers = {
      Shibuya: { lat: 35.658034, lng: 139.701630 },
      Minato: { lat: 35.658581, lng: 139.745433 },
      Shinjuku: { lat: 35.6895, lng: 139.6917 }
    };
    const center = centers[personalContext.location] || centers.Shibuya;

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
    if (lastLocationRef.current !== personalContext.location) {
      lastLocationRef.current = personalContext.location;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setCenter(center);
        setMapCenter(center);
      }
    }

    // 2. Clear existing Google Map markers
    googleMarkersRef.current.forEach(m => m.setMap(null));
    googleMarkersRef.current = [];

    // 3. Create current category & search-filtered markers
    const markersToDraw = googleMapsLoaded ? dynamicMarkers : (locationMarkers[personalContext.location] || []);

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
    const userPos = livePosition ?? getCityFallback(personalContext.location);
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

  }, [googleMapsLoaded, personalContext.location, dynamicMarkers, mapLayer, currentStep, user, isBypassed, livePosition, liveRoute, liveShelter]);

  // Dynamic Places API (New) fetcher — uses google.maps.places.Place.searchNearby.
  // Requires "Places API (New)" enabled in Google Cloud Console.
  useEffect(() => {
    if (!googleMapsLoaded || !mapCenter || typeof google === 'undefined' || !google.maps?.places?.Place) return;

    const CATEGORY_TYPES: Record<string, string[]> = {
      shelter: ['school', 'park', 'stadium', 'university', 'city_hall', 'gym'],
      water: ['convenience_store', 'supermarket', 'gas_station'],
      medical: ['hospital', 'pharmacy', 'doctor'],
      station: ['transit_station', 'subway_station', 'train_station', 'bus_station']
    };

    const activeCategories: string[] = filterCategory === 'all'
      ? ['shelter', 'water', 'medical', 'station']
      : [filterCategory];

    const { Place, SearchNearbyRankPreference } = google.maps.places as any;

    const searches = activeCategories.map(async (cat) => {
      try {
        const res = await Place.searchNearby({
          fields: ['id', 'displayName', 'location', 'formattedAddress', 'types'],
          locationRestriction: { center: mapCenter, radius: 3000 },
          includedPrimaryTypes: CATEGORY_TYPES[cat],
          maxResultCount: 20,
          rankPreference: SearchNearbyRankPreference?.DISTANCE
        });
        const places = res?.places ?? [];
        return places.map((p: any) => {
          const loc = p.location;
          const lat = typeof loc?.lat === 'function' ? loc.lat() : loc?.lat;
          const lng = typeof loc?.lng === 'function' ? loc.lng() : loc?.lng;
          const name = typeof p.displayName === 'string' ? p.displayName : (p.displayName?.text ?? 'Unknown');
          const descSuffix =
            cat === 'shelter' ? 'Designated shelter point.' :
            cat === 'water' ? 'Emergency water / supply node.' :
            cat === 'medical' ? 'Emergency medical / triage point.' :
            'Active evacuation transit point.';
          return {
            id: p.id,
            category: cat,
            name,
            lat,
            lng,
            desc: `${p.formattedAddress || 'Tokyo, Japan'}. ${descSuffix}`,
            x: 0,
            y: 0
          };
        });
      } catch (err) {
        console.warn(`[Places-New] ${cat} failed`, err);
        return [] as any[];
      }
    });

    Promise.all(searches).then((arrays) => {
      const merged = arrays.flat();
      const uniqueMap = new Map<string, any>();
      merged.forEach((item) => {
        if (item.id && !uniqueMap.has(item.id)) uniqueMap.set(item.id, item);
      });
      const deduplicated = Array.from(uniqueMap.values());
      console.info('[Places-New] result', { categories: activeCategories.length, total: deduplicated.length });

      const final = deduplicated.filter((m: any) => {
        if (!searchQuery) return true;
        return (
          (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (m.desc || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
      setDynamicMarkers(final);
    });

  }, [googleMapsLoaded, mapCenter, filterCategory, searchQuery, personalContext.location]);

  // Handle Credential Response from Google Sign-In
  const handleCredentialResponse = (response: any) => {
    try {
      setAuthLoading('google');
      const payload = parseJwt(response.credential);
      if (payload) {
        setUser({
          name: payload.name || payload.given_name || "Google User",
          email: payload.email,
          avatar: payload.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${payload.email}`
        });
      } else {
        alert("Authentication failed: Unable to read credentials.");
      }
    } catch (err) {
      console.error(err);
      alert("Error occurred during Google sign in.");
    } finally {
      setAuthLoading('none');
    }
  };

  // Set up Google Identity Services SDK Button on mount/state change
  useEffect(() => {
    const initializeGoogleGSI = () => {
      if (typeof google !== 'undefined' && google.accounts?.id) {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!clientId || clientId.includes("your-google-client-id")) {
          console.warn("VITE_GOOGLE_CLIENT_ID is not configured yet. Please configure it in .env file.");
        }
        google.accounts.id.initialize({
          client_id: clientId || 'dummy-client-id.apps.googleusercontent.com',
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true
        });

        const btnParent = document.getElementById("google-signin-button");
        if (btnParent) {
          google.accounts.id.renderButton(
            btnParent,
            { 
              theme: "filled_blue", 
              size: "large", 
              text: "signin_with", 
              shape: "pill",
              width: btnParent.clientWidth || 320 
            }
          );
        }
      }
    };

    // Try immediately
    initializeGoogleGSI();

    // Poll to check if the async defer script is loaded
    const interval = setInterval(() => {
      if (typeof google !== 'undefined' && google.accounts?.id) {
        initializeGoogleGSI();
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [user, isBypassed]);


  // Request real device geolocation once the user has authenticated
  useEffect(() => {
    if (!user && !isBypassed) return;
    let cancelled = false;
    requestUserPosition().then((pos) => {
      if (!cancelled && pos) setLivePosition(pos);
    });
    return () => {
      cancelled = true;
    };
  }, [user, isBypassed]);

  // Reverse-geocode the live position into a human-readable address
  useEffect(() => {
    if (!googleMapsLoaded || !livePosition) return;
    let cancelled = false;
    reverseGeocode(livePosition).then((addr) => {
      if (!cancelled && addr) setLiveAddress(addr);
    });
    return () => {
      cancelled = true;
    };
  }, [googleMapsLoaded, livePosition]);

  // Auto-detect display language from the browser on first mount
  useEffect(() => {
    const tag = (navigator.language || 'en').toLowerCase();
    const detected: PersonalContext['language'] =
      tag.startsWith('ja') ? 'Japanese' :
      tag.startsWith('zh') ? 'Chinese' :
      tag.startsWith('vi') ? 'Vietnamese' :
      'English';
    setPersonalContext((prev) => prev.language === detected ? prev : { ...prev, language: detected });
  }, []);

  // Auto-detect the user's Tokyo ward from the GPS-resolved address
  useEffect(() => {
    if (!liveAddress) return;
    const lower = liveAddress.toLowerCase();
    const ward: PersonalContext['location'] | null =
      lower.includes('shibuya') ? 'Shibuya' :
      lower.includes('shinjuku') ? 'Shinjuku' :
      lower.includes('minato') ? 'Minato' :
      null;
    if (ward) {
      setPersonalContext((prev) => prev.location === ward ? prev : { ...prev, location: ward });
    }
  }, [liveAddress]);

  // Handle Biometric Bypass Simulation
  const triggerBiometricBypass = () => {
    setShowFaceIdModal(true);
    setFaceIdState('scanning');
    
    // Simulate active scan line
    setTimeout(() => {
      setFaceIdState('success');
      setTimeout(() => {
        setIsBypassed(true);
        setShowFaceIdModal(false);
        setFaceIdState('idle');
      }, 1000);
    }, 2200);
  };

  // Handle Sign Out
  const handleSignOut = () => {
    setUser(null);
    setIsBypassed(false);
    setCurrentStep(-1);
    setIsSimulating(false);
    setSmsStatus('idle');
    setShowSmsModal(false);
  };

  // Agent Pipeline States
  const [agents, setAgents] = useState<AgentState[]>([
    { id: 'situation', name: 'Situation Agent', role: 'Hazard Analysis', status: 'idle', result: '' },
    { id: 'personal', name: 'Personal Context Agent', role: 'Vulnerability Analysis', status: 'idle', result: '' },
    { id: 'route', name: 'Route & Shelter Agent', role: 'Evacuation Mapping', status: 'idle', result: '' },
    { id: 'translate', name: 'Translate & Comms Agent', role: 'Language Synthesis', status: 'idle', result: '' },
    { id: 'commander', name: 'Commander Agent', role: 'Synthesis & Command', status: 'idle', result: '' }
  ]);

  // Translate labels dynamically based on selected language
  const labels = LANGUAGES_MAP[personalContext.language];

  // Dynamic advice synthesis based on context. Prefers live Gemini-generated steps;
  // falls back to the deterministic template below if Gemini is disabled or hasn't returned yet.
  const getDynamicAdvice = () => {
    if (liveSteps && liveSteps.length) return liveSteps;
    const { language, floor, companions, mobility } = personalContext;

    if (activeHazard === 'earthquake') {
      const steps = [];
      // Step 1: Drop Cover Hold or evac
      if (floor === '9th Floor') {
        steps.push({
          num: "1",
          title: language === 'English' ? "Drop, Cover, Hold" : language === 'Chinese' ? "伏地、遮挡、手扶" : language === 'Vietnamese' ? "Nằm xuống, Che chắn, Giữ chặt" : "伏せ、頭を守り、動かない",
          desc: language === 'English' ? "High rise shaking. Stay away from glass window walls." : language === 'Chinese' ? "高楼层摇晃剧烈。请远离玻璃幕墙。" : language === 'Vietnamese' ? "Tòa nhà cao tầng rung lắc. Tránh xa các vách kính." : "高層ビル特有の揺れ。窓ガラスから離れてください。"
        });
      } else if (floor === 'Ground Floor') {
        steps.push({
          num: "1",
          title: language === 'English' ? "Evacuate Outwards" : language === 'Chinese' ? "立即疏散到室外" : language === 'Vietnamese' ? "Sơ tán ra bên ngoài" : "屋外へ避難してください",
          desc: language === 'English' ? "Ground floor risks. Evacuate immediately if safety exits are clear." : language === 'Chinese' ? "低楼层风险。安全通道畅通时请立即撤离。" : language === 'Vietnamese' ? "Nguy cơ sập đổ. Sơ tán ngay lập tức nếu lối thoát hiểm an toàn." : "低階のリスク。安全出口が確保されている場合は即座に避難。"
        });
      } else {
        steps.push({
          num: "1",
          title: language === 'English' ? "Protect Head & Move Up" : language === 'Chinese' ? "护住头部并往上撤" : language === 'Vietnamese' ? "Bảo vệ đầu & di chuyển lên" : "頭を保護し、地上へ避難",
          desc: language === 'English' ? "Basement trap risk. Move to ground level once heavy shaking stops." : language === 'Chinese' ? "地下陷阱风险。剧烈摇晃停止后请立即前往地面。" : language === 'Vietnamese' ? "Nguy cơ mắc kẹt dưới hầm. Di chuyển lên mặt đất khi hết rung lắc." : "地下での閉じ込めリスク。揺れが収まり次第、地上へ移動。"
        });
      }

      // Step 2: Elevators
      steps.push({
        num: "2",
        title: language === 'English' ? "Take Stairs, NOT Elevator" : language === 'Chinese' ? "走安全通道，禁用电梯" : language === 'Vietnamese' ? "Đi cầu thang bộ, KHÔNG dùng thang máy" : "階段を使用（エレベーター禁止）",
        desc: companions === 'With a Child' 
          ? (language === 'English' ? "Secure stroller, carry child. Walk calmly down." : language === 'Chinese' ? "抱住孩子，收起婴儿车。有序下楼。" : language === 'Vietnamese' ? "Gấp xe đẩy, bế trẻ em. Đi bộ bình tĩnh." : "ベビーカーは畳み、子供を抱きかかえて歩いてください。")
          : companions === 'With Elderly Parents'
          ? (language === 'English' ? "Support companion. Avoid rushing, pace yourselves." : language === 'Chinese' ? "扶助长辈。避免拥挤，稳步前行。" : language === 'Vietnamese' ? "Hỗ trợ cha mẹ lớn tuổi. Tránh chen lấn, đi vững chắc." : "高齢の家族をサポートしてください。焦らず、一歩ずつ下りてください。")
          : (language === 'English' ? "Keep hands free. Walk, do not run." : language === 'Chinese' ? "双手保持空闲。小步快走，切勿奔跑。" : language === 'Vietnamese' ? "Giữ hai tay tự do. Đi bộ, không chạy." : "両手を空けてください。走らず歩いてください。")
      });

      // Step 3: Route
      const shelterInfo = getShelterInfo(personalContext.location, language, googleMapsLoaded ? dynamicMarkers : undefined);
      const shelter = `${shelterInfo.name} (${shelterInfo.distance})`;
      steps.push({
        num: "3",
        title: language === 'English' ? `Evacuate to ${shelter}` : language === 'Chinese' ? `前往 ${shelter} 避难` : language === 'Vietnamese' ? `Sơ tán đến ${shelter}` : `${shelter} へ避難`,
        desc: mobility === 'Wheelchair User'
          ? (language === 'English' ? "Route is pre-vetted with ADA flat access ramps." : language === 'Chinese' ? "该路线已预先规划无障碍轮椅坡道。" : language === 'Vietnamese' ? "Tuyến đường đã được xác thực hỗ trợ xe lăn vô ngại." : "車椅子対応のバリアフリー経路が確保されています。")
          : (language === 'English' ? "Direct, hazard-free sidewalk path mapped below." : language === 'Chinese' ? "下方已为您绘制了无危险建筑物的避难路径。" : language === 'Vietnamese' ? "Bản đồ hiển thị tuyến đường đi bộ an toàn, không vật cản." : "落下物の危険が少ないルートが以下にマッピングされています。")
      });

      return steps;
    } else if (activeHazard === 'typhoon') {
      return [
        {
          num: "1",
          title: language === 'English' ? "Shelter Indoors" : language === 'Chinese' ? "室内避难" : language === 'Vietnamese' ? "Trú ẩn trong nhà" : "室内避難",
          desc: language === 'English' ? "Extreme category 4 winds. Lock all glass windows and storms shields." : language === 'Chinese' ? "超强4级台风。锁紧所有窗户并拉上防风网。" : language === 'Vietnamese' ? "Gió bão giật cấp 4 cực mạnh. Khóa chặt tất cả cửa kính." : "非常に強い台風。すべての窓と防風シャッターを閉めてください。"
        },
        {
          num: "2",
          title: language === 'English' ? "Move Away From Windows" : language === 'Chinese' ? "远离外窗" : language === 'Vietnamese' ? "Tránh xa cửa sổ" : "窓から離れる",
          desc: floor === 'Basement' 
            ? (language === 'English' ? "Basement flooding threat! Move to upper floors immediately." : language === 'Chinese' ? "地下室积水威胁！请立即转移至高层楼层。" : language === 'Vietnamese' ? "Nguy cơ ngập lụt tầng hầm! Di chuyển ngay lên tầng trên." : "地下浸水のリスク！直ちに上の階に避難してください。")
            : (language === 'English' ? "Debris impact hazard. Stay in inner-rooms or hallways." : language === 'Chinese' ? "碎物撞击危险。请待在无窗的内室或走廊。" : language === 'Vietnamese' ? "Mảnh vỡ có thể văng vào. Trú ẩn trong phòng kín hoặc lối đi giữa nhà." : "飛来物の危険。窓のない内室か廊下で待機してください。")
        },
        {
          num: "3",
          title: language === 'English' ? "Monitor Local Inundation" : language === 'Chinese' ? "监控积水深度" : language === 'Vietnamese' ? "Theo dõi mực nước ngập" : "浸水情報のモニタリング",
          desc: language === 'English' ? "Checking high-ground evacuation path if sea surges occur." : language === 'Chinese' ? "如发生风暴潮，系统将规划高地避难路径。" : language === 'Vietnamese' ? "Sẵn sàng lộ trình sơ tán lên vùng cao nếu có triều cường dâng." : "高潮発生に備え、高台への避難経路を準備しています。"
        }
      ];
    } else {
      // Tsunami
      return [
        {
          num: "1",
          title: language === 'English' ? "Seek Immediate High Ground" : language === 'Chinese' ? "立即寻找高处避难" : language === 'Vietnamese' ? "Tìm nơi cao ráo ngay" : "直ちに高台避難",
          desc: language === 'English' ? "Tsunami wave alert height 3m+. You must climb immediately." : language === 'Chinese' ? "海啸波高预警3米以上。请立刻向高处攀爬。" : language === 'Vietnamese' ? "Cảnh báo sóng thần cao trên 3m. Di chuyển lên cao ngay lập tức." : "大津波警報（予想高3m超）。今すぐ高台へ避難してください。"
        },
        {
          num: "2",
          title: language === 'English' ? "Vertical Evacuation" : language === 'Chinese' ? "垂直避难" : language === 'Vietnamese' ? "Sơ tán khẩn cấp theo chiều dọc" : "垂直避難の実行",
          desc: floor === '9th Floor'
            ? (language === 'English' ? "Stay on current 9th floor. You are well above wave crest height." : language === 'Chinese' ? "留在当前9楼。您的高度已远超预计浪高。" : language === 'Vietnamese' ? "Hãy ở lại tầng 9 hiện tại. Bạn đang ở độ cao an toàn trước sóng thần." : "現在の9階に留まってください。波高を大幅に上回っています。")
            : (language === 'English' ? "Ground floor vulnerable. Climb to 4th floor or higher in nearest strong structure." : language === 'Chinese' ? "低楼层极其危险。请立即爬到附近坚固建筑的4层 or 以上。" : language === 'Vietnamese' ? "Tầng trệt vô cùng nguy hiểm. Di chuyển lên tầng 4 hoặc cao hơn của tòa nhà kiên cố." : "低階は極めて危険。頑丈なビルの4階以上に上ってください。")
        },
        {
          num: "3",
          title: language === 'English' ? "Do NOT Drive or Use Elevators" : language === 'Chinese' ? "切勿驾车或乘电梯" : language === 'Vietnamese' ? "KHÔNG tự lái xe hay dùng thang máy" : "運転およびエレベーター禁止",
          desc: language === 'English' ? "Road gridlock and power outages imminent. Evacuate on foot." : language === 'Chinese' ? "交通瘫痪及停电迫在眉睫。请徒步避难。" : language === 'Vietnamese' ? "Giao thông dễ tắc nghẽn & mất điện diện rộng. Đi bộ thoát hiểm." : "渋滞と停電の恐れ。徒歩での避難を徹底してください。"
        }
      ];
    }
  };

  // Live multi-agent pipeline. Real Gemini calls when VITE_GEMINI_API_KEY is configured;
  // otherwise falls back to the original deterministic timeline so the demo still works.
  useEffect(() => {
    if (!isSimulating || currentStep !== 0) return;

    const runId = ++pipelineRunIdRef.current;
    let cancelled = false;
    const cancelTimers: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) => new Promise<void>((resolve) => {
      const t = setTimeout(resolve, ms);
      cancelTimers.push(t);
    });

    const markRunning = (idx: number) =>
      setAgents(prev => prev.map((a, i) => i === idx ? { ...a, status: 'running' } : a));
    const markCompleted = (idx: number, result: string) =>
      setAgents(prev => prev.map((a, i) => i === idx ? { ...a, status: 'completed', result } : a));
    const stillCurrent = () => !cancelled && runId === pipelineRunIdRef.current;

    const profile = {
      language: personalContext.language,
      location: personalContext.location,
      floor: personalContext.floor,
      companions: personalContext.companions,
      mobility: personalContext.mobility
    };

    // Pick the nearest shelter from real Places results (falls back to city-center logic if Places empty)
    const originPos = livePosition ?? getCityFallback(personalContext.location);
    const nearest = findNearestShelter(originPos, dynamicMarkers);
    const fallbackShelterInfo = getShelterInfo(personalContext.location, 'English', googleMapsLoaded ? dynamicMarkers : undefined);
    const shelterInfo = nearest
      ? {
          name: nearest.name,
          fullName: nearest.name,
          distance: nearest.distanceMeters < 1000
            ? `${Math.round(nearest.distanceMeters)}m`
            : `${(nearest.distanceMeters / 1000).toFixed(1)}km`,
          detail: nearest.desc || 'Nearest designated shelter (from Google Places).',
          desc: nearest.desc || ''
        }
      : fallbackShelterInfo;
    const shelterDistance = shelterInfo.distance;
    const shelterPos = nearest ? { lat: nearest.lat, lng: nearest.lng } : null;

    const fallbackSituation =
      activeHazard === 'earthquake'
        ? `M7.2 Earthquake detected. ${personalContext.location} intensity JMA 5-Upper. Tsunami threat: ADVISORY (0.5m waves expected).`
        : activeHazard === 'typhoon'
        ? `Category 4 Typhoon (Whip) making landfall in Kanto. Sustained winds 140km/h. Heavy rain 50mm/hr near ${personalContext.location}.`
        : `M8.4 Subduction Quake. ${personalContext.location} intensity JMA 6-Lower. Major Tsunami Warning (Waves 3.2m in 8 mins).`;

    const fallbackSteps: ActionStep[] = [
      { num: '1', title: 'Drop, Cover, Hold', desc: 'Take immediate protective posture and shield your head from falling debris.' },
      { num: '2', title: 'Take Stairs, Not Elevator', desc: 'Move calmly through the safest exit, supporting any companions.' },
      { num: '3', title: `Evacuate to ${shelterInfo.name} (${shelterInfo.distance})`, desc: 'Follow the highlighted route on the map.' }
    ];

    const run = async () => {
      try {
        // ── Step 0: Situation Agent ──
        markRunning(0);
        const [signal] = await Promise.all([
          fetchHazardSignal(activeHazard, personalContext.location),
          wait(300)
        ]);
        if (!stillCurrent()) return;
        setHazardSignal(signal);

        let situationResult = fallbackSituation;
        if (isGeminiConfigured) {
          try {
            situationResult = await runSituationAgent({
              hazard: activeHazard,
              location: personalContext.location,
              jmaSignal: signal
            });
          } catch (e) {
            console.warn('Situation agent failed; using fallback.', e);
          }
        }
        if (!stillCurrent()) return;
        markCompleted(0, situationResult);
        setCurrentStep(1);

        // ── Step 1: Personal Context Agent (resolves real address) ──
        markRunning(1);
        let address: string | null = liveAddress;
        if (!address && livePosition) {
          address = await reverseGeocode(livePosition);
          if (address) setLiveAddress(address);
        }
        let personalResult = address
          ? `User at "${address}" — ${profile.floor}, ${profile.companions}, ${profile.mobility}. Vulnerability rating: HIGH.`
          : `User context parsed: Lang: ${profile.language}, Location: ${profile.location}, Floor: ${profile.floor}, Companions: ${profile.companions}, Mobility: ${profile.mobility}. Vulnerability rating: HIGH.`;
        if (isGeminiConfigured) {
          try {
            personalResult = await runPersonalAgent(profile, address);
          } catch (e) {
            console.warn('Personal agent failed; using fallback.', e);
            await wait(600);
          }
        } else {
          await wait(1000);
        }
        if (!stillCurrent()) return;
        markCompleted(1, personalResult);
        setCurrentStep(2);

        // ── Step 2: Route & Shelter Agent (fetches REAL walking directions) ──
        markRunning(2);
        let walkingRoute: WalkingRoute | null = null;
        if (shelterPos && googleMapsLoaded) {
          walkingRoute = await getWalkingRoute(originPos, shelterPos);
          if (walkingRoute) {
            setLiveRoute(walkingRoute);
            setLiveShelter({
              name: shelterInfo.name,
              distanceMeters: walkingRoute.distanceMeters,
              lat: shelterPos.lat,
              lng: shelterPos.lng
            });
          }
        }

        const realDist = walkingRoute?.distanceText;
        const realEta = walkingRoute?.durationText;
        let routeResult = walkingRoute
          ? `Nearest shelter: ${shelterInfo.name}. Walking ${realDist}, ETA ${realEta} via Google Directions. Path avoids highway segments.`
          : `Closest safe shelter: ${shelterInfo.name} (${shelterInfo.detail}). Route validated.`;
        let stepsPromise: Promise<ActionStep[]> = Promise.resolve(fallbackSteps);
        if (isGeminiConfigured) {
          stepsPromise = generateActionSteps({
            profile,
            hazard: activeHazard,
            shelterName: shelterInfo.name,
            shelterDistance,
            walkingDuration: realEta,
            address
          }).catch((e) => {
            console.warn('Action-step generation failed; using fallback.', e);
            return fallbackSteps;
          });
          try {
            routeResult = await runRouteAgent({
              profile,
              hazard: activeHazard,
              shelterName: shelterInfo.name,
              shelterDistance,
              walkingDistance: realDist,
              walkingDuration: realEta
            });
          } catch (e) {
            console.warn('Route agent failed; using fallback.', e);
          }
        } else {
          await wait(1000);
        }
        if (!stillCurrent()) return;
        markCompleted(2, routeResult);
        setCurrentStep(3);

        // ── Step 3: Translate & Comms Agent (+ generate SMS in parallel) ──
        markRunning(3);
        const trackerUrl = `https://saferoute.ai/t/${personalContext.location.slice(0, 4).toLowerCase()}`;
        let translateResult = `Draft text generated in ${profile.language}. Emergency contact parsed. Human validation required.`;
        let smsPromise: Promise<string> = Promise.resolve('');
        if (isGeminiConfigured) {
          smsPromise = generateSmsDraft({
            profile,
            hazard: activeHazard,
            shelterName: shelterInfo.name,
            trackerUrl
          }).catch((e) => {
            console.warn('SMS draft failed; using fallback.', e);
            return '';
          });
          try {
            translateResult = await runTranslateAgent(profile);
          } catch (e) {
            console.warn('Translate agent failed; using fallback.', e);
          }
        } else {
          await wait(1200);
        }
        if (!stillCurrent()) return;
        markCompleted(3, translateResult);
        setCurrentStep(4);

        // ── Step 4: Commander Agent (+ resolve steps + SMS) ──
        markRunning(4);
        const [steps, sms, commanderText] = await Promise.all([
          stepsPromise,
          smsPromise,
          isGeminiConfigured
            ? runCommanderAgent(profile, activeHazard).catch((e) => {
                console.warn('Commander agent failed; using fallback.', e);
                return `Command list compiled with 3 hyper-personalized steps in ${profile.language}. Layout dispatched.`;
              })
            : Promise.resolve(`Command list compiled with 3 hyper-personalized steps in ${profile.language}. Layout dispatched.`)
        ]);
        if (!stillCurrent()) return;
        setLiveSteps(steps && steps.length ? steps : fallbackSteps);
        if (sms) setLiveSmsDraft(sms);
        markCompleted(4, commanderText);
        setIsSimulating(false);
        setShowSmsModal(true);
      } catch (err) {
        console.error('Pipeline failed unexpectedly', err);
        if (!stillCurrent()) return;
        setIsSimulating(false);
      }
    };

    run();

    return () => {
      cancelled = true;
      cancelTimers.forEach(clearTimeout);
    };
  }, [isSimulating, currentStep, activeHazard, personalContext, googleMapsLoaded, dynamicMarkers]);

  // Restart simulation
  const handleTriggerAlert = () => {
    // Reset agent statuses + any cached live model output
    setAgents(prev => prev.map(a => ({ ...a, status: 'idle', result: '' })));
    setHazardSignal(null);
    setLiveSteps(null);
    setLiveSmsDraft(null);
    setLiveRoute(null);
    setLiveShelter(null);
    setSmsStatus('idle');
    setShowSmsModal(false);
    setCurrentStep(0);
    setIsSimulating(true);
  };

  const handleApproveSms = () => {
    setSmsStatus('sending');
    setTimeout(() => {
      setSmsStatus('sent');
      setTimeout(() => {
        setShowSmsModal(false);
      }, 2000);
    }, 1500);
  };

  // Get the drafted message text. Prefers live Gemini draft when available.
  const getDraftedSmsText = () => {
    if (liveSmsDraft && liveSmsDraft.trim().length > 0) return liveSmsDraft;
    const lang = personalContext.language;
    const loc = personalContext.location;
    const floorClean = personalContext.floor.replace(' Floor', '');
    
    // Dynamic localization maps
    const localizedLocMap: Record<string, Record<string, string>> = {
      Shibuya: { English: 'Shibuya', Chinese: '涉谷', Vietnamese: 'Shibuya', Japanese: '渋谷' },
      Minato: { English: 'Minato', Chinese: '港区', Vietnamese: 'Minato', Japanese: '港区' },
      Shinjuku: { English: 'Shinjuku', Chinese: '新宿', Vietnamese: 'Shinjuku', Japanese: '新宿' }
    };
    
    const trackerUrlMap: Record<string, string> = {
      Shibuya: 'https://saferoute.ai/t/shib',
      Minato: 'https://saferoute.ai/t/mina',
      Shinjuku: 'https://saferoute.ai/t/shinj'
    };

    const locName = (localizedLocMap[loc] && localizedLocMap[loc][lang]) || loc;
    const shelterName = getShelterInfo(loc, lang, googleMapsLoaded ? dynamicMarkers : undefined).name;
    const trackerUrl = trackerUrlMap[loc] || 'https://saferoute.ai/t/shib';

    if (activeHazard === 'earthquake') {
      if (lang === 'English') {
        return `Alert: Strong quake in ${locName}. We're safe (floor ${floorClean}, with child). Heading to ${shelterName}. Tracker: ${trackerUrl}`;
      }
      if (lang === 'Chinese') {
        return `警告：${locName}发生强震。我们安全（位于${personalContext.floor}，带孩子）。正撤往${shelterName}。追踪链接: ${trackerUrl}`;
      }
      if (lang === 'Vietnamese') {
        return `Cảnh báo: Động chất mạnh ở ${locName}. Chúng tôi ổn (tầng ${floorClean}, đi cùng con nhỏ). Đang tới ${shelterName}. Bản đồ: ${trackerUrl}`;
      }
      return `【緊急連絡】${locName}で強い地震。無事です（${personalContext.floor}・子供同伴）。${shelterName}へ移動します。現在地：${trackerUrl}`;
    } else if (activeHazard === 'typhoon') {
      if (lang === 'English') {
        return `Alert: Category 4 Typhoon in Tokyo. Staying inside on floor ${floorClean}. Secured. Track: ${trackerUrl}`;
      }
      if (lang === 'Chinese') {
        return `警告：台风4级登陆东京。我们在${personalContext.floor}室内避险。一切安好。追踪: ${trackerUrl}`;
      }
      if (lang === 'Vietnamese') {
        return `Cảnh báo: Bão Cấp 4 ở Tokyo. Đang trú ẩn ở tầng ${floorClean}. An toàn. Định vị: ${trackerUrl}`;
      }
      return `【緊急連絡】大型台風接近中。安全に${personalContext.floor}に留まっています。無事です。GPS：${trackerUrl}`;
    } else {
      if (lang === 'English') {
        return `Alert: Major Tsunami Warning! Evacuating to safe vertical height. Position: ${locName}. Track: ${trackerUrl}`;
      }
      if (lang === 'Chinese') {
        return `紧急警报：大海啸预警！我们正前往高处垂直避难。${locName}。追踪: ${trackerUrl}`;
      }
      if (lang === 'Vietnamese') {
        return `Cảnh báo khẩn: Sóng thần lớn! Đang sơ tán lên vùng cao an toàn. ${locName}. Định vị: ${trackerUrl}`;
      }
      return `【大津波警報】津波から避難するため、高台へ向かっています。現在地：${locName}。URL: ${trackerUrl}`;
    }
  };

  return (
    <div className="min-h-screen mobile-device-wrapper flex flex-col items-center justify-center p-0 sm:p-6 select-none">
      {/* Brand Header (Desktop Only) */}
      <div className="hidden sm:flex flex-col items-center mb-6 text-center">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-8 h-8 text-indigo-400 animate-pulse" />
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">
            SafeRoute AI <span className="text-indigo-400 text-lg font-medium font-sans">安心避難</span>
          </h1>
        </div>
        <p className="text-slate-400 text-sm max-w-sm">
          A premium multi-agent disaster co-pilot with a strict human-approval safety gate.
        </p>
      </div>

      {/* iPhone Device Shell Mockup */}
      <div className="mobile-device-frame bg-slate-950 w-full h-screen sm:h-[844px] sm:w-[390px] flex flex-col justify-between shadow-2xl relative text-white">
        
        {/* iOS Dynamic Island Area */}
        <div className="absolute top-0 inset-x-0 h-10 flex items-center justify-center z-50 pointer-events-none">
          <div className="w-28 h-6 bg-black rounded-full flex items-center justify-between px-3.5">
            <span className="text-[10px] text-emerald-400 font-bold tracking-tight">12:30</span>
            <div className="flex gap-1.5 items-center">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></span>
              <span className="text-[9px] text-slate-400 font-medium font-sans">5G</span>
            </div>
          </div>
        </div>

        {!user && !isBypassed ? (
          /* ==========================================
             PREMIUM AUTHENTICATION & LOGIN GUARD
             ========================================== */
          <div className="flex-1 flex flex-col pt-12 overflow-y-auto px-5 pb-8 scrollbar-none justify-between animate-in fade-in duration-300">
            {/* Top Logo and Tagline */}
            <div className="flex flex-col items-center text-center mt-6">
              <div className="relative mb-4 group">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full blur opacity-40 group-hover:opacity-60 transition duration-1000 group-hover:duration-200 animate-pulse" />
                <div className="relative w-16 h-16 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center shadow-lg">
                  <Shield className="w-8 h-8 text-indigo-400 animate-pulse" />
                </div>
              </div>
              <h2 className="text-xl font-black tracking-tight text-white font-sans uppercase">SafeRoute AI</h2>
              <span className="text-[10px] text-indigo-400 font-mono tracking-widest uppercase font-bold">安心避難 • Disaster Co-pilot</span>
              <p className="text-slate-400 text-xs px-4 mt-3 leading-relaxed">
                Active multi-agent advisor for urban hazards. Verify identity to sync contacts, medical records, and live telemetry.
              </p>
            </div>

            {/* Real Google OAuth & Email Credentials Login */}
            <div className="my-6 space-y-4">
              {/* Google OAuth Login Button */}
              <div className="w-full flex flex-col items-center">
                <div 
                  id="google-signin-button" 
                  className="w-full flex justify-center h-11"
                />
                {authLoading === 'google' && (
                  <div className="mt-2 text-[10px] text-indigo-400 font-mono flex items-center gap-1.5 animate-pulse">
                    <span className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    Securely connecting to Google Identity Services...
                  </div>
                )}
              </div>

            </div>

            {/* Offline Biometric Bypass (The Wow Factor) */}
            <div className="border border-indigo-950/40 bg-indigo-950/10 rounded-2xl p-3.5 text-center space-y-2.5">
              <div className="flex flex-col items-center">
                <Fingerprint className="w-6 h-6 text-indigo-400 animate-pulse" />
                <h4 className="text-[11px] font-bold text-indigo-300 mt-1 uppercase">Emergency Offline Bypass</h4>
                <p className="text-[10px] text-slate-400 leading-normal px-2 mt-0.5">
                  No internet connection or cellular signal? Access local cache, maps, and offline routing immediately via FaceID bypass.
                </p>
              </div>
              <button
                type="button"
                onClick={triggerBiometricBypass}
                className="w-full h-9 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold rounded-xl transition duration-200 active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <Unlock className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                Trigger FaceID Bypass
              </button>
            </div>
          </div>
        ) : (
          /* ==========================================
             MAIN PREMIUM GOOGLE MAPS DISASTER CO-PILOT DASHBOARD
             ========================================== */
          <>
            {/* Custom keyframe styles for smooth offline animations */}
            <style dangerouslySetInnerHTML={{ __html: `
              @keyframes lineDash {
                to { stroke-dashoffset: -20; }
              }
              @keyframes pulseRadar {
                0% { r: 8px; opacity: 0.8; }
                100% { r: 24px; opacity: 0; }
              }
              @keyframes scanline {
                0% { transform: translateY(-100%); }
                100% { transform: translateY(100%); }
              }
              .line-dash {
                animation: lineDash 1.2s linear infinite;
              }
              .radar-pulse {
                animation: pulseRadar 2s cubic-bezier(0.24, 0, 0.38, 1) infinite;
              }
              .scan-overlay {
                animation: scanline 8s linear infinite;
              }
              .scrollbar-none::-webkit-scrollbar {
                display: none;
              }
              .scrollbar-none {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}} />

            {/* REAL GOOGLE MAPS DIV */}
            <div 
              ref={mapRef} 
              className="absolute inset-0 w-full h-full z-0 overflow-hidden" 
              style={{ display: googleMapsLoaded ? 'block' : 'none' }}
            />

            {/* SVG Fallback Map (Offline and No-Key resilience) */}
            {!googleMapsLoaded && (() => {
              // Extract current markers based on category filter and search query
              const currentMarkers = (locationMarkers[personalContext.location] || []).filter((m: any) => {
                const matchesCategory = filterCategory === 'all' || m.category === filterCategory;
                const matchesSearch = searchQuery === '' || 
                  m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  m.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  m.category.toLowerCase().includes(searchQuery.toLowerCase());
                return matchesCategory && matchesSearch;
              });

              // Coordinates and Routes config
              const mapConfig = {
                Shibuya: {
                  user: { x: 180, y: 490 },
                  shelter: { x: 252, y: 345 },
                  route: "M 180 490 L 180 420 L 252 420 L 252 345"
                },
                Minato: {
                  user: { x: 120, y: 480 },
                  shelter: { x: 210, y: 390 },
                  route: "M 120 480 L 195 480 L 195 390 L 210 390"
                },
                Shinjuku: {
                  user: { x: 190, y: 340 },
                  shelter: { x: 250, y: 490 },
                  route: "M 190 340 L 190 480 L 250 480 L 250 490"
                }
              }[personalContext.location];

              return (
                <div className="absolute inset-0 w-full h-full bg-[#0d1117] z-0 overflow-hidden select-none">
                  {/* Outer Map SVG wrapper */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 390 844" fill="none" xmlns="http://www.w3.org/2000/svg">
                    
                    {/* SATELLITE GRID OVERLAY */}
                    {mapLayer === 'satellite' && (
                      <g opacity="0.15">
                        <defs>
                          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#0ea5e9" strokeWidth="0.5" />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                      </g>
                    )}

                    {/* DYNAMIC LANDMARKS & PARKS */}
                    {personalContext.location === 'Shibuya' && (
                      <>
                        {/* Yoyogi Park */}
                        <path d="M 15 40 C 80 20, 160 50, 140 180 C 130 240, 60 260, 15 180 Z" fill={mapLayer === 'satellite' ? '#022c22' : '#064e3b'} fillOpacity={mapLayer === 'satellite' ? '0.7' : '0.8'} stroke="#10b981" strokeWidth="0.5" />
                        <text x="55" y="140" fill="#10b981" fontSize="9" fontWeight="bold" className="font-sans tracking-wide" opacity="0.6">Yoyogi Park</text>
                        
                        {/* Miyashita Park */}
                        <rect x="235" y="260" width="25" height="130" rx="4" fill={mapLayer === 'satellite' ? '#042f2e' : '#0f766e'} fillOpacity="0.8" stroke="#14b8a6" strokeWidth="0.5" />
                        <text x="248" y="325" fill="#14b8a6" fontSize="7" fontWeight="bold" writingMode="tb" className="font-sans" opacity="0.8">Miyashita Park</text>

                        {/* Shibuya Crossing Visual */}
                        <g opacity="0.2">
                          <rect x="170" y="410" width="20" height="20" fill="#334155" />
                          <path d="M 172 410 L 172 430 M 176 410 L 176 430 M 180 410 L 180 430 M 184 410 L 184 430 M 188 410 L 188 430" stroke="white" strokeWidth="1" />
                        </g>
                        <text x="140" y="445" fill="#94a3b8" fontSize="8" className="font-sans font-medium" opacity="0.4">Shibuya Crossing</text>
                      </>
                    )}

                    {personalContext.location === 'Minato' && (
                      <>
                        {/* Shiba Park */}
                        <rect x="150" y="320" width="140" height="140" rx="10" fill={mapLayer === 'satellite' ? '#022c22' : '#064e3b'} fillOpacity="0.8" stroke="#10b981" strokeWidth="0.5" />
                        <text x="175" y="360" fill="#10b981" fontSize="9" fontWeight="bold" className="font-sans tracking-wide" opacity="0.6">Shiba Park</text>

                        {/* Tokyo Tower Truss Symbol */}
                        <g transform="translate(235, 415)" opacity="0.8">
                          <line x1="0" y1="15" x2="0" y2="-20" stroke="#ef4444" strokeWidth="1.5" />
                          <line x1="-10" y1="15" x2="0" y2="-10" stroke="#ef4444" strokeWidth="1.5" />
                          <line x1="10" y1="15" x2="0" y2="-10" stroke="#ef4444" strokeWidth="1.5" />
                          <line x1="-6" y1="0" x2="6" y2="0" stroke="#ef4444" strokeWidth="1" />
                          <line x1="-4" y1="-10" x2="4" y2="-10" stroke="#ef4444" strokeWidth="1" />
                          <circle cx="0" cy="-21" r="2" fill="#ef4444" className="animate-pulse" />
                        </g>
                        <text x="210" y="445" fill="#ef4444" fontSize="8" fontWeight="bold" className="font-sans" opacity="0.7">Tokyo Tower</text>
                      </>
                    )}

                    {personalContext.location === 'Shinjuku' && (
                      <>
                        {/* Shinjuku Gyoen */}
                        <rect x="140" y="380" width="220" height="230" rx="16" fill={mapLayer === 'satellite' ? '#022c22' : '#064e3b'} fillOpacity="0.8" stroke="#10b981" strokeWidth="0.5" />
                        <text x="210" y="440" fill="#10b981" fontSize="10" fontWeight="bold" className="font-sans tracking-wide" opacity="0.6">Shinjuku Gyoen</text>

                        {/* Gov Building Outline */}
                        <g transform="translate(60, 260)" opacity="0.6" stroke="#38bdf8" strokeWidth="1" fill="none">
                          <rect x="0" y="10" width="12" height="60" rx="1" />
                          <rect x="18" y="10" width="12" height="60" rx="1" />
                          <rect x="0" y="40" width="30" height="30" />
                          <path d="M 6 10 L 6 0 M 24 10 L 24 0" />
                        </g>
                        <text x="45" y="340" fill="#38bdf8" fontSize="8" className="font-sans" opacity="0.5">TMG Building</text>
                      </>
                    )}

                    {/* ROAD NETWORKS LAYER */}
                    <g opacity={mapLayer === 'satellite' ? '0.3' : '0.5'}>
                      {personalContext.location === 'Shibuya' && (
                        <>
                          {/* Meiji-dori */}
                          <path d="M 180 40 L 180 800" stroke={mapLayer === 'traffic' ? '#10b981' : '#475569'} strokeWidth={mapLayer === 'traffic' ? '5' : '4'} strokeLinecap="round" />
                          {/* Yamate-dori */}
                          <path d="M 80 40 L 80 800" stroke={mapLayer === 'traffic' ? '#10b981' : '#334155'} strokeWidth="3" strokeLinecap="round" />
                          {/* Route 246 */}
                          <path d="M 15 420 L 375 420" stroke={mapLayer === 'traffic' ? '#ef4444' : '#475569'} strokeWidth={mapLayer === 'traffic' ? '6' : '5'} strokeLinecap="round" />
                          {/* Miyashita Crossing road connection */}
                          <path d="M 15 280 L 375 580" stroke={mapLayer === 'traffic' ? '#f59e0b' : '#334155'} strokeWidth="3" strokeLinecap="round" />
                        </>
                      )}

                      {personalContext.location === 'Minato' && (
                        <>
                          <path d="M 50 150 L 340 650" stroke={mapLayer === 'traffic' ? '#10b981' : '#475569'} strokeWidth="4" strokeLinecap="round" />
                          <path d="M 50 650 L 340 150" stroke={mapLayer === 'traffic' ? '#f59e0b' : '#475569'} strokeWidth="4" strokeLinecap="round" />
                          <path d="M 195 50 L 195 780" stroke={mapLayer === 'traffic' ? '#ef4444' : '#334155'} strokeWidth="3" strokeLinecap="round" />
                          <path d="M 50 400 L 350 400" stroke={mapLayer === 'traffic' ? '#10b981' : '#334155'} strokeWidth="3" strokeLinecap="round" />
                        </>
                      )}

                      {personalContext.location === 'Shinjuku' && (
                        <>
                          {/* Grids */}
                          <line x1="90" y1="50" x2="90" y2="780" stroke={mapLayer === 'traffic' ? '#10b981' : '#475569'} strokeWidth="3" />
                          <line x1="190" y1="50" x2="190" y2="780" stroke={mapLayer === 'traffic' ? '#ef4444' : '#475569'} strokeWidth="4" />
                          <line x1="290" y1="50" x2="290" y2="780" stroke={mapLayer === 'traffic' ? '#10b981' : '#334155'} strokeWidth="3" />
                          <line x1="15" y1="200" x2="375" y2="200" stroke={mapLayer === 'traffic' ? '#10b981' : '#475569'} strokeWidth="4" />
                          <line x1="15" y1="340" x2="375" y2="340" stroke={mapLayer === 'traffic' ? '#f59e0b' : '#475569'} strokeWidth="3" />
                          <line x1="15" y1="480" x2="375" y2="480" stroke={mapLayer === 'traffic' ? '#10b981' : '#334155'} strokeWidth="4" />
                          <line x1="15" y1="620" x2="375" y2="620" stroke={mapLayer === 'traffic' ? '#334155' : '#1e293b'} strokeWidth="3" />
                        </>
                      )}
                    </g>

                    {/* DYNAMIC GLOWING HAZARD ZONES (If Hazard layer or Alert is active) */}
                    {(mapLayer === 'hazard' || currentStep >= 0) && (
                      <g>
                        {/* Red warning radial gradients around hazards */}
                        {personalContext.location === 'Shibuya' && (
                          <circle cx="100" cy="450" r="45" fill="url(#hazardGrad)" className="animate-pulse" opacity="0.35" />
                        )}
                        {personalContext.location === 'Minato' && (
                          <circle cx="150" cy="580" r="50" fill="url(#hazardGrad)" className="animate-pulse" opacity="0.35" />
                        )}
                        {personalContext.location === 'Shinjuku' && (
                          <circle cx="190" cy="200" r="45" fill="url(#hazardGrad)" className="animate-pulse" opacity="0.35" />
                        )}
                        <defs>
                          <radialGradient id="hazardGrad">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                            <stop offset="70%" stopColor="#ef4444" stopOpacity="0.1" />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                          </radialGradient>
                        </defs>
                      </g>
                    )}

                    {/* ANIMATED CO-PILOT SAFE EVACUATION ROUTE PATH */}
                    {currentStep >= 0 && mapConfig && (
                      <g>
                        {/* Route Shadow glow */}
                        <path
                          d={mapConfig.route}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="7"
                          strokeLinecap="round"
                          opacity="0.3"
                          style={{ filter: 'blur(3px)' }}
                        />
                        {/* Active animated dashed line */}
                        <path
                          d={mapConfig.route}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="4.5"
                          strokeLinecap="round"
                          strokeDasharray="9 7"
                          className="line-dash"
                          style={{
                            filter: 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.8))'
                          }}
                        />
                      </g>
                    )}

                    {/* DYNAMIC MARKERS (SHELTERS, WATER, CLINICS, DANGER) */}
                    {currentMarkers.map((marker: any) => {
                      const color = {
                        shelter: '#10b981', // green
                        water: '#0ea5e9',   // blue
                        medical: '#a855f7', // purple
                        hazard: '#ef4444'   // red
                      }[marker.category as 'shelter' | 'water' | 'medical' | 'hazard'] || '#38bdf8';

                      const isSelected = activeMarker === marker.id;

                      return (
                        <g 
                          key={marker.id} 
                          transform={`translate(${marker.x}, ${marker.y})`} 
                          className="cursor-pointer group"
                          onClick={() => setActiveMarker(marker.id)}
                        >
                          {/* Outer pulse indicator */}
                          <circle r="12" fill="none" stroke={color} strokeWidth="1.5" className="radar-pulse" />
                          {/* Inner pin shadow */}
                          <ellipse cx="0" cy="8" rx="4" ry="1.5" fill="#000000" opacity="0.3" />
                          
                          {/* Pin body shape */}
                          <path 
                            d="M 0 8 C -5 2, -7.5 -3, -7.5 -9 C -7.5 -16, -4 -20, 0 -20 C 4 -20, 7.5 -16, 7.5 -9 C 7.5 -3, 5 2, 0 8 Z" 
                            fill={color} 
                            stroke="#0d1117" 
                            strokeWidth="1.2"
                            className={`transition-all duration-300 ${isSelected ? 'scale-125 -translate-y-1' : 'group-hover:scale-110 group-hover:-translate-y-0.5'}`}
                          />
                          {/* Pin white center core */}
                          <circle cx="0" cy="-9" r="3.2" fill="#ffffff" />
                          {/* Small icon mapping core dots */}
                          <circle cx="0" cy="-9" r="1.5" fill={color} />
                        </g>
                      );
                    })}

                    {/* CURRENT USER POSITION (Blue pulsing dot) */}
                    {mapConfig && (
                      <g transform={`translate(${mapConfig.user.x}, ${mapConfig.user.y})`}>
                        {/* Radar Ripple waves */}
                        <circle cx="0" cy="0" r="12" fill="none" stroke="#2563eb" strokeWidth="1.5" className="radar-pulse" />
                        <circle cx="0" cy="0" r="24" fill="none" stroke="#2563eb" strokeWidth="1" className="radar-pulse" style={{ animationDelay: '0.6s' }} />
                        {/* Blue glow core */}
                        <circle cx="0" cy="0" r="8" fill="#3b82f6" fillOpacity="0.3" />
                        {/* Base Core Dot */}
                        <circle cx="0" cy="0" r="5" fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 0 4px rgba(37, 99, 235, 0.6))' }} />
                      </g>
                    )}
                  </svg>
                </div>
              );
            })()}

            {/* FLOATING TOP GOOGLE MAPS SEARCH BAR */}
            <div className="absolute top-12 left-4 right-4 z-30 flex flex-col gap-2.5">
              <div className="backdrop-blur-md bg-slate-900/85 border border-slate-800/80 rounded-2xl py-2.5 px-4 flex items-center justify-between shadow-2xl relative">
                <div className="flex items-center gap-2.5 flex-1 mr-2">
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search ${personalContext.location} evacuation...`}
                    className="bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none w-full border-none"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="p-0.5 hover:bg-slate-800 rounded-full transition text-slate-400 hover:text-slate-200">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Vertical Divider line */}
                <div className="h-4 w-px bg-slate-800 mx-1.5 shrink-0" />

                {/* Profile Session Avatar / Menu Button with Hover LogOut Animation */}
                <div className="flex items-center gap-2 shrink-0 ml-1.5 relative group/profile">
                  <button 
                    onClick={handleSignOut}
                    className="w-7 h-7 rounded-full border border-slate-700 hover:border-red-500/30 hover:bg-red-500/10 flex items-center justify-center transition bg-slate-950/80 text-slate-400 hover:text-red-400 relative overflow-hidden"
                    title="Log Out Session"
                  >
                    {user?.avatar ? (
                      <>
                        <img src={user.avatar} alt="Avatar" className="w-full h-full rounded-full group-hover/profile:opacity-0 transition-opacity" />
                        <LogOut className="w-3.5 h-3.5 absolute opacity-0 group-hover/profile:opacity-100 transition-opacity text-red-400" />
                      </>
                    ) : (
                      <>
                        <User className="w-3.5 h-3.5 group-hover/profile:opacity-0 transition-opacity" />
                        <LogOut className="w-3.5 h-3.5 absolute opacity-0 group-hover/profile:opacity-100 transition-opacity text-red-400" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* HORIZONTAL CATEGORY SCROLLABLE CHIPS */}
              <div className="overflow-x-auto whitespace-nowrap flex gap-2 pb-1 scrollbar-none select-none">
                {[
                  { id: 'all', label: 'All', emoji: '🗺️' },
                  { id: 'shelter', label: 'Shelters', emoji: '🏥' },
                  { id: 'water', label: 'Water', emoji: '⛲' },
                  { id: 'medical', label: 'Medical', emoji: '🩹' },
                  { id: 'station', label: 'Stations', emoji: '🚉' }
                ].map((chip) => {
                  const isActive = filterCategory === chip.id;
                  return (
                    <button
                      key={chip.id}
                      onClick={() => setFilterCategory(chip.id as any)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10.5px] font-extrabold tracking-wide uppercase transition border shadow-md active:scale-95 ${
                        isActive 
                          ? 'bg-indigo-600 border-indigo-400 text-white font-sans' 
                          : 'bg-slate-900/85 backdrop-blur border-slate-800/80 text-slate-300 hover:text-white'
                      }`}
                    >
                      <span className="text-xs leading-none">{chip.emoji}</span>
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* FLOATING RIGHT-SIDE CONTROLS */}
            <div className="absolute top-36 right-4 z-30 flex flex-col gap-2.5">
              {/* Map Layers Controller */}
              <div className="relative">
                <button
                  onClick={() => setShowLayerMenu(!showLayerMenu)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg border transition ${
                    showLayerMenu || mapLayer !== 'streets'
                      ? 'bg-indigo-600 border-indigo-400 text-white'
                      : 'bg-slate-900/85 backdrop-blur border-slate-800/80 text-slate-300 hover:text-white'
                  }`}
                  title="Map Layers"
                >
                  <Layers className="w-4 h-4" />
                </button>

                {/* Floating Layers Dropdown */}
                {showLayerMenu && (
                  <div className="absolute right-11 top-0 bg-slate-900/95 backdrop-blur border border-slate-800 rounded-xl p-2 shadow-2xl flex flex-col gap-1.5 min-w-[120px] animate-in fade-in zoom-in-95 duration-200">
                    {[
                      { id: 'streets', label: 'Vector Map' },
                      { id: 'satellite', label: 'Satellite' },
                      { id: 'traffic', label: 'Live Traffic' },
                      { id: 'hazard', label: 'Hazard Feed' }
                    ].map((layer) => (
                      <button
                        key={layer.id}
                        onClick={() => {
                          setMapLayer(layer.id as any);
                          setShowLayerMenu(false);
                        }}
                        className={`text-left text-[10px] font-extrabold uppercase px-2.5 py-1.5 rounded-lg transition ${
                          mapLayer === layer.id
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        {layer.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Recenter Button */}
              <button
                onClick={() => {
                  setActiveMarker(null);
                  setSearchQuery('');
                }}
                className="w-9 h-9 rounded-xl bg-slate-900/85 backdrop-blur border border-slate-800/80 text-slate-300 hover:text-white flex items-center justify-center shadow-lg active:scale-95 transition"
                title="Recenter Map"
              >
                <Navigation className="w-4 h-4 transform rotate-45" />
              </button>

              {/* Voice Assistant Toggle */}
              <button
                onClick={() => setVoiceAssistant(!voiceAssistant)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg border transition active:scale-95 ${
                  voiceAssistant
                    ? 'bg-emerald-600 border-emerald-400 text-white animate-pulse'
                    : 'bg-slate-900/85 backdrop-blur border-slate-800/80 text-slate-300 hover:text-white'
                }`}
                title="Audio Co-pilot Guidance"
              >
                {voiceAssistant ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>

              {/* Emergency SOS Pulse Trigger */}
              <button
                onClick={handleTriggerAlert}
                disabled={isSimulating}
                className="w-10 h-10 rounded-xl bg-red-600 hover:bg-red-500 text-white border border-red-400 flex items-center justify-center shadow-lg active:scale-95 disabled:opacity-45 disabled:pointer-events-none transition relative group"
                title="Trigger Emergency Advisory"
              >
                <span className="absolute inset-0 rounded-xl bg-red-600 animate-ping opacity-30 group-hover:opacity-40" />
                <AlertTriangle className="w-4.5 h-4.5 text-white animate-pulse relative z-10" />
              </button>
            </div>

            {/* SELECTION POPUP INFO CARD OVER MAP */}
            {activeMarker && (() => {
              const markersList = googleMapsLoaded ? dynamicMarkers : (locationMarkers[personalContext.location] || []);
              const marker = markersList.find((m: any) => m.id === activeMarker);
              if (!marker) return null;
              const isShelter = marker.category === 'shelter';
              return (
                <div className="absolute top-60 left-4 right-4 z-20 backdrop-blur-md bg-slate-950/85 border border-slate-800 rounded-2xl p-3.5 shadow-2xl animate-in slide-in-from-top-4 duration-300 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">
                        {marker.category === 'shelter' ? '🏥' : marker.category === 'water' ? '⛲' : marker.category === 'medical' ? '🩹' : '🚉'}
                      </span>
                      <h4 className="text-[11.5px] font-black text-slate-100 font-sans tracking-wide uppercase">{marker.name}</h4>
                    </div>
                    <button 
                      onClick={() => setActiveMarker(null)}
                      className="p-0.5 hover:bg-slate-800 rounded-full transition text-slate-400 hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal font-mono">{marker.desc}</p>
                  
                  {isShelter && (
                    <div className="flex justify-between items-center mt-1 text-[10px]">
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> ADA Accessible
                      </span>
                      {currentStep < 0 && (
                        <button 
                          onClick={() => {
                            handleTriggerAlert();
                            setIsDrawerExpanded(true);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wide transition font-sans text-[9px]"
                        >
                          Navigate Route
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* GOOGLE MAPS EXPANDABLE BOTTOM SHEET DRAWER */}
            <div 
              className={`absolute left-0 right-0 bottom-0 bg-slate-900 border-t border-slate-800 rounded-t-3xl z-40 transition-all duration-300 ease-out shadow-2xl flex flex-col ${
                isDrawerExpanded ? 'h-[520px]' : 'h-[110px]'
              }`}
            >
              {/* Drawer Top Header - Interactive Drag/Expand Bar */}
              <div 
                onClick={() => setIsDrawerExpanded(!isDrawerExpanded)}
                className="w-full py-3 flex flex-col items-center cursor-pointer hover:bg-slate-850/50 rounded-t-3xl transition duration-150 shrink-0"
              >
                {/* Visual Drag pill */}
                <div className="w-10 h-1 bg-slate-700 rounded-full mb-1.5" />
                
                {/* Dynamic Status / ETA Display */}
                <div className="w-full px-5 flex justify-between items-center text-left">
                  <div className="flex gap-2.5 items-center">
                    <Compass className={`w-5 h-5 text-indigo-400 ${isSimulating ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
                    <div className="flex flex-col">
                      <span className="text-xs font-black tracking-tight text-white font-sans uppercase">
                        {currentStep >= 4 
                          ? `${getShelterInfo(personalContext.location, 'English', googleMapsLoaded ? dynamicMarkers : undefined).name} Safe Route`
                          : currentStep >= 0 
                          ? '📡 Analyzing active safety route...'
                          : '🟢 SafeRoute AI Active'}
                      </span>
                      <span className="text-[9.5px] text-slate-400 font-mono leading-none mt-0.5 uppercase tracking-wide">
                        {currentStep >= 4 
                          ? '8 Min ETA • 450m • Hazard-Free Path' 
                          : isBypassed ? '⚠️ Emergency Offline Local Base' : '🔐 Real-Time Cloud Node'}
                      </span>
                    </div>
                  </div>

                  <div className="p-1 text-slate-400 hover:text-white transition shrink-0">
                    {isDrawerExpanded ? <ChevronDown className="w-4.5 h-4.5" /> : <ChevronUp className="w-4.5 h-4.5" />}
                  </div>
                </div>
              </div>

              {/* Drawer Content Area (Scrollable when expanded) */}
              {isDrawerExpanded && (
                <div className="flex-1 overflow-y-auto px-5 pb-8 scrollbar-none space-y-4">
                  
                  {/* VOICE ASSISTANT LIVE FEED (If active) */}
                  {voiceAssistant && (
                    <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-3 flex gap-2.5 items-center animate-in zoom-in-95 duration-200">
                      <div className="relative shrink-0">
                        <span className="absolute -inset-1 rounded-full bg-emerald-500 animate-ping opacity-30" />
                        <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center">
                          <Mic className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                      </div>
                      <div className="flex-1 text-[10.5px]">
                        <span className="font-extrabold uppercase text-emerald-400 block tracking-wide font-sans text-[9.5px]">Voice Assistant Active</span>
                        <p className="text-slate-300 font-mono leading-relaxed mt-0.5">
                          {currentStep >= 4 
                            ? "“Follow the highlighted green line along Meiji-dori. Ahead on Miyashita Crossing, shelter is elevated. No hazards reported.”"
                            : "“Standing by. Ready to vocalize live escape telemetry and triage routing once simulation starts.”"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* LIVE TELEMETRY CARD — real GPS + nearest shelter + walking ETA */}
                  <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-3.5 space-y-2">
                    <div className="flex items-center gap-1.5 text-slate-300 pb-1.5 border-b border-slate-900/60">
                      <Navigation className="w-4 h-4 text-emerald-400" />
                      <span className="text-[10.5px] font-extrabold tracking-wider uppercase font-sans">Live Telemetry</span>
                      <span className="ml-auto text-[9px] font-mono uppercase text-slate-500">
                        {livePosition ? 'GPS LOCKED' : 'AWAITING GPS'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 text-[10.5px] font-mono">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3 h-3 text-indigo-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-slate-500 uppercase tracking-wide font-bold text-[9px]">You are at</span>
                          <p className="text-slate-200 leading-snug break-words">
                            {liveAddress || (livePosition
                              ? `${livePosition.lat.toFixed(5)}, ${livePosition.lng.toFixed(5)}`
                              : 'Acquiring device location…')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <Shield className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-slate-500 uppercase tracking-wide font-bold text-[9px]">Nearest shelter</span>
                          <p className="text-slate-200 leading-snug break-words">
                            {liveShelter
                              ? `${liveShelter.name}`
                              : (dynamicMarkers.find((m: any) => m.category === 'shelter')?.name || 'Awaiting Places data…')}
                          </p>
                        </div>
                      </div>
                      {liveRoute && (
                        <div className="flex items-start gap-1.5">
                          <Compass className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-slate-500 uppercase tracking-wide font-bold text-[9px]">Walking route</span>
                            <p className="text-slate-200 leading-snug">
                              {liveRoute.distanceText} · ETA {liveRoute.durationText}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Inline hazard scenario switcher — replaces the old setup form */}
                    <div className="pt-2 border-t border-slate-900/60">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-slate-500 uppercase tracking-wide font-bold text-[9px]">Drill scenario</span>
                        <span className="text-[9px] font-mono text-slate-600">{personalContext.language}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {([
                          { id: 'earthquake', label: 'Earthquake', emoji: '🌋' },
                          { id: 'typhoon', label: 'Typhoon', emoji: '🌀' },
                          { id: 'tsunami', label: 'Tsunami', emoji: '🌊' }
                        ] as { id: 'earthquake' | 'typhoon' | 'tsunami'; label: string; emoji: string }[]).map((h) => (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() => !isSimulating && setActiveHazard(h.id)}
                            disabled={isSimulating}
                            className={`text-[10px] font-bold py-1.5 rounded-xl border transition active:scale-95 ${
                              activeHazard === h.id
                                ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                            } ${isSimulating ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <span className="mr-1">{h.emoji}</span>{h.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ACTIVE LIVE HAZARD ADVISORY */}
                  {currentStep >= 0 && (
                    <div className={`border rounded-2xl overflow-hidden shadow-lg animate-in fade-in duration-300 ${
                      activeHazard === 'earthquake' ? 'bg-red-950/20 border-red-500/35 text-red-200' :
                      activeHazard === 'typhoon' ? 'bg-sky-950/20 border-sky-500/35 text-sky-200' :
                      'bg-amber-950/20 border-amber-500/35 text-amber-200'
                    }`}>
                      <div className={`px-3 py-2 flex items-center justify-between text-[10.5px] font-bold border-b ${
                        activeHazard === 'earthquake' ? 'bg-red-950/60 border-red-500/20' :
                        activeHazard === 'typhoon' ? 'bg-sky-950/60 border-sky-500/20' :
                        'bg-amber-950/60 border-amber-500/20'
                      }`}>
                        <span className="flex items-center gap-1.5 uppercase font-sans">
                          <AlertTriangle className="w-3.5 h-3.5 animate-bounce" />
                          {activeHazard === 'earthquake' ? '気象庁 地震緊急警報 (JMA)' : activeHazard === 'typhoon' ? '特別台風警報 (JMA)' : '大津波警報発表 (JMA)'}
                        </span>
                        <span className="text-[9px] font-mono tracking-wider">
                          {hazardSignal ? hazardSignal.source : 'AWAITING FEED'}
                        </span>
                      </div>
                      <div className="p-3 text-[11px] font-mono leading-relaxed select-text">
                        {hazardSignal
                          ? hazardSignal.bulletinJa
                          : activeHazard === 'earthquake' ? '気象庁の地震速報を取得しています…'
                          : activeHazard === 'typhoon' ? '気象庁の台風情報を取得しています…'
                          : '気象庁の津波警報を取得しています…'}
                      </div>
                    </div>
                  )}

                  {/* MULTI-AGENT PIPELINE CONSOLE LOGS */}
                  {currentStep >= 0 && (
                    <div className="bg-slate-950/60 border border-slate-850/60 rounded-2xl p-3.5">
                      <h3 className="text-[10.5px] font-bold tracking-wider uppercase text-slate-400 flex items-center gap-1.5 mb-2.5 pb-1 border-b border-slate-900/40">
                        <Activity className="w-3.5 h-3.5 text-indigo-400" />
                        Multi-Agent Pipeline Logs
                      </h3>
                      <div className="space-y-2">
                        {agents.map((agent: any, i: number) => {
                          const isActive = currentStep === i;
                          return (
                            <div key={agent.id} className={`text-[10.5px] rounded-xl p-2.5 transition ${isActive ? 'bg-indigo-950/25 border border-indigo-500/30' : 'bg-slate-950/30 border border-slate-900/30'}`}>
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-1.5">
                                  {agent.status === 'completed' && <Check className="w-3 h-3 text-emerald-400" />}
                                  {agent.status === 'running' && <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping shrink-0" />}
                                  {agent.status === 'idle' && <span className="w-1.5 h-1.5 bg-slate-800 rounded-full shrink-0" />}
                                  <span className={`font-black font-sans uppercase ${isActive ? 'text-indigo-300' : 'text-slate-300'}`}>{agent.name}</span>
                                  <span className="text-[9px] text-slate-500 font-mono">({agent.role})</span>
                                </div>
                                <div>
                                  {agent.status === 'running' && <span className="text-[9px] text-indigo-400 font-bold animate-pulse font-mono uppercase">Thinking</span>}
                                  {agent.status === 'completed' && <span className="text-[9px] text-emerald-400/80 font-mono font-bold uppercase">Ready</span>}
                                  {agent.status === 'idle' && <span className="text-[9px] text-slate-600 font-mono font-semibold uppercase">Pending</span>}
                                </div>
                              </div>
                              
                              {agent.status === 'running' && (
                                <div className="mt-1.5 space-y-1">
                                  <div className="h-1.5 w-full animate-shimmer rounded bg-slate-800" />
                                  <div className="h-1.5 w-4/5 animate-shimmer rounded bg-slate-800" />
                                </div>
                              )}

                              {agent.status === 'completed' && (
                                <p className="mt-1 text-[10px] text-slate-400 leading-normal font-mono select-text bg-slate-950/50 p-1.5 rounded border border-slate-900/40">{agent.result}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* HIGH-TECH FINAL ACTION ADVICE CARDS */}
                  {currentStep >= 4 && (
                    <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-3.5 space-y-3 shadow-xl">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-900">
                        <Shield className="w-5 h-5 text-indigo-400" />
                        <span className="text-[11px] font-extrabold tracking-wider uppercase font-sans text-indigo-300">
                          {labels.instructions}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {getDynamicAdvice().map((step: any) => (
                          <div key={step.num} className="flex gap-2.5 items-start p-2.5 bg-slate-950 border border-slate-900 rounded-xl">
                            <div className="w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-[10px] font-black text-indigo-400 font-mono shrink-0 mt-0.5">
                              {step.num}
                            </div>
                            <div className="flex-1 text-[11px]">
                              <h3 className="font-bold text-slate-100 font-sans leading-snug">{step.title}</h3>
                              <p className="text-slate-400 mt-0.5 leading-relaxed">{step.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Manual Trigger For SMS Confirmation Portal */}
                      <div className="pt-2 border-t border-slate-900 flex justify-between items-center text-[11px]">
                        <span className="text-[10px] text-indigo-400/80 font-mono flex items-center gap-1 font-sans">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Safe Route Formulated
                        </span>
                        <button 
                          onClick={() => setShowSmsModal(true)}
                          className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline flex items-center gap-1 transition"
                        >
                          {labels.approving} <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STANDBY STATE ADVICE PANEL */}
                  {currentStep < 0 && (
                    <div className="flex flex-col justify-center items-center py-6 text-center animate-in fade-in duration-300">
                      <div className="w-12 h-16 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center mb-3 shadow-inner">
                        <Smartphone className="w-6 h-6 text-indigo-400 animate-pulse" />
                      </div>
                      <h4 className="text-[11.5px] font-bold text-slate-200 font-sans">SafeRoute AI Evacuation Assistant</h4>
                      <p className="text-slate-400 text-[10px] px-6 mt-1.5 leading-relaxed max-w-[280px]">
                        Configured with local Tokyo shelter feeds, Google Identity API, and Gemini 3.5. Trigger an alert on the map or expand configs to start co-piloting.
                      </p>
                      
                      <button 
                        onClick={handleTriggerAlert}
                        className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-5 rounded-full shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        {labels.trigger}
                      </button>
                    </div>
                  )}

                  {/* RESTART SIMULATION IN DRAWER IF COMPLETED */}
                  {currentStep >= 4 && (
                    <div className="flex justify-center pt-2">
                      <button 
                        onClick={handleTriggerAlert}
                        disabled={isSimulating}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-300 hover:text-white rounded-xl text-xs font-bold shadow transition active:scale-95"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restart Emergency Replay
                      </button>
                    </div>
                  )}

                </div>
              )}
            </div>

            {/* Dynamic iOS Safety Gate Modal (Sliding Draw Sheet) */}
            {showSmsModal && (
              <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-50 flex flex-col justify-end animate-in fade-in duration-300">
                <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 space-y-4 animate-in slide-in-from-bottom duration-300">
                  
                  {/* Modal Drag Handle */}
                  <div className="flex justify-center -mt-2.5 mb-2">
                    <div className="w-12 h-1 bg-slate-700 rounded-full" />
                  </div>

                  {/* Title Header */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-indigo-400" />
                      <div>
                        <h4 className="text-sm font-extrabold tracking-tight text-white font-sans uppercase">
                          {labels.approving}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">Emergency Approval Gate</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowSmsModal(false)}
                      className="p-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Interactive SMS Preview Card */}
                  <div className="border border-slate-800 rounded-2xl overflow-hidden shadow-inner bg-slate-950/60 p-4">
                    <div className="flex justify-between items-center border-b border-slate-850 pb-2 mb-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                        <span>TO: Emergency Contacts</span>
                      </div>
                      <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-mono font-extrabold">SMS DRAFT</span>
                    </div>
                    
                    <p className="text-xs text-slate-200 font-mono leading-relaxed bg-indigo-950/15 border border-indigo-950/45 p-3 rounded-xl select-text">
                      {getDraftedSmsText()}
                    </p>

                    <div className="mt-3 flex gap-2 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1 font-mono"><Users className="w-3 h-3 text-indigo-400" /> Yen (Spouse)</span>
                      <span className="flex items-center gap-1 font-mono"><MapPin className="w-3 h-3 text-indigo-400" /> Smart Live GPS Attached</span>
                    </div>
                  </div>

                  {/* Confirmation Action State Controls */}
                  {smsStatus === 'idle' && (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button 
                        onClick={() => setShowSmsModal(false)}
                        className="border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold py-3 px-4 rounded-xl text-xs active:scale-95 transition-all"
                      >
                        Hold / Edit
                      </button>
                      <button 
                        onClick={handleApproveSms}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/15"
                      >
                        <Send className="w-3.5 h-3.5" /> Approve & Send
                      </button>
                    </div>
                  )}

                  {smsStatus === 'sending' && (
                    <div className="py-4 flex flex-col items-center justify-center">
                      <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
                      <span className="text-xs text-slate-300 font-bold tracking-tight">Encrypting & transmitting satellite SMS...</span>
                    </div>
                  )}

                  {smsStatus === 'sent' && (
                    <div className="py-4 flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
                      <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mb-2 shadow-lg">
                        <Check className="w-6 h-6 stroke-[3]" />
                      </div>
                      <span className="text-xs text-emerald-400 font-bold tracking-tight mb-0.5">{labels.sent}</span>
                      <span className="text-[10px] text-slate-500 font-mono">Message delivered to 1 contact</span>
                    </div>
                  )}

                </div>
              </div>
            )}
          </>
        )}

        {/* iOS Face ID Telemetry Overlay Modal */}
        {showFaceIdModal && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="w-full max-w-[220px] text-center space-y-6">
              
              {/* Animated FaceID target scanner */}
              <div className="relative w-40 h-40 mx-auto border-2 border-indigo-500/20 rounded-[44px] flex items-center justify-center overflow-hidden bg-slate-900/40 shadow-inner">
                {/* Custom Face ID layout lines */}
                <div className="absolute inset-4 border border-dashed border-indigo-500/10 rounded-[32px]" />
                
                {/* Face icon with state */}
                <Fingerprint className={`w-20 h-20 transition duration-500 ${
                  faceIdState === 'success' ? 'text-emerald-400 scale-105' :
                  faceIdState === 'scanning' ? 'text-indigo-400 animate-pulse animate-[pulse_1s_infinite]' :
                  'text-slate-500'
                }`} />

                {/* Cyber Scanner Laser Line */}
                {faceIdState === 'scanning' && (
                  <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent top-0 animate-[scan_2.2s_ease-in-out_infinite]" />
                )}
                
                {/* Glowing border on success */}
                {faceIdState === 'success' && (
                  <div className="absolute inset-0 border-2 border-emerald-400 rounded-[44px] animate-ping opacity-25" />
                )}
              </div>

              {/* Telemetry Status Labels */}
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold tracking-tight text-white font-sans uppercase leading-none">
                  {faceIdState === 'scanning' ? "Scanning Biometrics..." : "Access Granted!"}
                </h3>
                <p className="text-[9px] text-slate-400 font-mono uppercase tracking-widest leading-none">
                  {faceIdState === 'scanning' ? "Analyzing face telemetry..." : "LOCAL DECRYPTION SUCCESSFUL"}
                </p>
              </div>

              {/* Status Indicator */}
              <div className="flex justify-center items-center gap-1.5 text-xs">
                {faceIdState === 'scanning' ? (
                  <span className="text-[9px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-mono uppercase font-bold">Offline Local Sync...</span>
                ) : (
                  <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono uppercase font-bold">Offline Decrypted</span>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
