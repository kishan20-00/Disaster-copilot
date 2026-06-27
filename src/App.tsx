import { useState, useEffect, useRef } from 'react';
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
  Settings,
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
    { id: 'shibuya-shelter', category: 'shelter', name: 'Miyashita Park Shelter', x: 252, y: 345, lat: 35.6617, lng: 139.7020, desc: 'Elevated open-air park. Capacity: 5,000. ADA Access verified.' },
    { id: 'shibuya-water', category: 'water', name: 'Shibuya Well Station', x: 120, y: 320, lat: 35.6585, lng: 139.6975, desc: 'Solar-powered ground aquifer water tap. Active.' },
    { id: 'shibuya-medical', category: 'medical', name: 'Shibuya Triage Center', x: 280, y: 550, lat: 35.6558, lng: 139.7040, desc: 'First aid, blankets, and local network routing.' },
    { id: 'shibuya-hazard', category: 'hazard', name: 'Fallen Glass Hazard', x: 100, y: 450, lat: 35.6575, lng: 139.6995, desc: 'Shattered facade glass. Blocked road.' }
  ],
  Minato: [
    { id: 'minato-shelter', category: 'shelter', name: 'Shiba Park Shelter', x: 210, y: 390, lat: 35.6556, lng: 139.7483, desc: 'Large open-ground shelter near Tokyo Tower. Capacity: 8,000.' },
    { id: 'minato-water', category: 'water', name: 'Tokyo Tower Water Reservoir', x: 100, y: 250, lat: 35.6586, lng: 139.7454, desc: 'Underground emergency fresh-water supply.' },
    { id: 'minato-medical', category: 'medical', name: 'Roppongi Medical Clinic', x: 290, y: 520, lat: 35.6620, lng: 139.7330, desc: 'Triage team active. Emergency generator operational.' },
    { id: 'minato-hazard', category: 'hazard', name: 'Structural Risk: Overpass', x: 150, y: 580, lat: 35.6530, lng: 139.7420, desc: 'Highway structural cracks. High risk area.' }
  ],
  Shinjuku: [
    { id: 'shinjuku-shelter', category: 'shelter', name: 'Shinjuku Gyoen Shelter', x: 250, y: 490, lat: 35.6852, lng: 139.7095, desc: 'Massive open park refuge. Capacity: 25,000. Windbreak forest.' },
    { id: 'shinjuku-water', category: 'water', name: 'Gyoen Water Station', x: 300, y: 310, lat: 35.6880, lng: 139.7130, desc: 'Clean groundwater well with manual pumps.' },
    { id: 'shinjuku-medical', category: 'medical', name: 'Shinjuku First Aid Tent', x: 110, y: 420, lat: 35.6895, lng: 139.6990, desc: 'Red Cross outpost. Medical supplies stocked.' },
    { id: 'shinjuku-hazard', category: 'hazard', name: 'Subway Flooding', x: 190, y: 200, lat: 35.6905, lng: 139.7040, desc: 'Underground tunnel ingress. Closed.' }
  ]
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
  const [filterCategory, setFilterCategory] = useState<'all' | 'shelter' | 'water' | 'medical' | 'hazard'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMarker, setActiveMarker] = useState<string | null>(null);
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);
  const [voiceAssistant, setVoiceAssistant] = useState(false);
  const [showLayerMenu, setShowLayerMenu] = useState(false);

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
      // Force Google Maps to recalculate container boundaries and center after the DOM paints
      setTimeout(() => {
        if (mapInstanceRef.current) {
          google.maps.event.trigger(mapInstanceRef.current, 'resize');
          mapInstanceRef.current.setCenter(center);
        }
      }, 150);
    } else {
      mapInstanceRef.current.setCenter(center);
    }

    // 2. Clear existing Google Map markers
    googleMarkersRef.current.forEach(m => m.setMap(null));
    googleMarkersRef.current = [];

    // 3. Create current category & search-filtered markers
    const currentMarkers = (locationMarkers[personalContext.location] || []).filter((m: any) => {
      const matchesCategory = filterCategory === 'all' || m.category === filterCategory;
      const matchesSearch = searchQuery === '' || 
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        m.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });

    currentMarkers.forEach((markerData: any) => {
      const color = {
        shelter: '#10b981',
        water: '#0ea5e9',
        medical: '#a855f7',
        hazard: '#ef4444'
      }[markerData.category as 'shelter' | 'water' | 'medical' | 'hazard'] || '#38bdf8';

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
      });

      googleMarkersRef.current.push(marker);
    });

    // 4. Place current user position pin (Blue pulsing core dot)
    const userPositions = {
      Shibuya: { lat: 35.6565, lng: 139.7000 },
      Minato: { lat: 35.6595, lng: 139.7390 },
      Shinjuku: { lat: 35.6882, lng: 139.7015 }
    };
    const userPos = userPositions[personalContext.location];
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
      const shelterData = (locationMarkers[personalContext.location] || []).find((m: any) => m.category === 'shelter');
      if (shelterData && userPos) {
        let pathCoords = [userPos];
        if (personalContext.location === 'Shibuya') {
          pathCoords.push({ lat: 35.6580, lng: 139.7000 });
          pathCoords.push({ lat: 35.6600, lng: 139.7020 });
        } else if (personalContext.location === 'Minato') {
          pathCoords.push({ lat: 35.6575, lng: 139.7420 });
          pathCoords.push({ lat: 35.6565, lng: 139.7450 });
        } else if (personalContext.location === 'Shinjuku') {
          pathCoords.push({ lat: 35.6865, lng: 139.7050 });
          pathCoords.push({ lat: 35.6852, lng: 139.7080 });
        }
        pathCoords.push({ lat: shelterData.lat, lng: shelterData.lng });

        routePolylineRef.current = new google.maps.Polyline({
          path: pathCoords,
          geodesic: true,
          strokeColor: '#10b981',
          strokeOpacity: 0.85,
          strokeWeight: 5,
          map: mapInstanceRef.current
        });

        // Fit bounds to fit the route on screen smoothly
        const bounds = new google.maps.LatLngBounds();
        pathCoords.forEach(coord => bounds.extend(coord));
        mapInstanceRef.current.fitBounds(bounds);
      }
    }

  }, [googleMapsLoaded, personalContext.location, filterCategory, searchQuery, activeMarker, mapLayer, currentStep, user, isBypassed]);

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

  // Dynamic advice synthesis based on context
  const getDynamicAdvice = () => {
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
      const shelter = personalContext.location === 'Shibuya' ? 'Miyashita Park (400m)' : personalContext.location === 'Minato' ? 'Shiba Park (650m)' : 'Shinjuku Gyoen (800m)';
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

  // Run the multi-agent pipeline simulation
  useEffect(() => {
    if (!isSimulating) return;

    if (currentStep === 0) {
      // Step 0: Situation Agent starts
      setAgents(prev => prev.map((a, i) => i === 0 ? { ...a, status: 'running' } : a));
      const t = setTimeout(() => {
        setAgents(prev => prev.map((a, i) => i === 0 ? { 
          ...a, 
          status: 'completed', 
          result: activeHazard === 'earthquake' 
            ? "M7.2 Earthquake detected. Shibuya intensity JMA 5-Upper. Tsunami threat: ADVISORY (0.5m waves expected)." 
            : activeHazard === 'typhoon'
            ? "Category 4 Typhoon (Whip) making landfall in Kanto. Sustained winds 140km/h. Heavy rain 50mm/hr."
            : "M8.4 Subduction Quake. Shibuya intensity JMA 6-Lower. Major Tsunami Warning (Waves 3.2m in 8 mins)."
        } : a));
        setCurrentStep(1);
      }, 2500);
      return () => clearTimeout(t);
    }

    if (currentStep === 1) {
      // Step 1: Personal Context Agent runs
      setAgents(prev => prev.map((a, i) => i === 1 ? { ...a, status: 'running' } : a));
      const t = setTimeout(() => {
        setAgents(prev => prev.map((a, i) => i === 1 ? { 
          ...a, 
          status: 'completed', 
          result: `User context parsed: Lang: ${personalContext.language}, Location: ${personalContext.location}, Floor: ${personalContext.floor}, Companions: ${personalContext.companions}, Mobility: ${personalContext.mobility}. Vulnerability rating: HIGH.`
        } : a));
        setCurrentStep(2);
      }, 2000);
      return () => clearTimeout(t);
    }

    if (currentStep === 2) {
      // Step 2: Route & Shelter Agent runs
      setAgents(prev => prev.map((a, i) => i === 2 ? { ...a, status: 'running' } : a));
      const t = setTimeout(() => {
        const shelter = personalContext.location === 'Shibuya' ? 'Miyashita Park (Open, elevated shelter, 400m, ADA compliant path available)' : personalContext.location === 'Minato' ? 'Shiba Park (Open, 650m)' : 'Shinjuku Gyoen (Open, 800m)';
        setAgents(prev => prev.map((a, i) => i === 2 ? { 
          ...a, 
          status: 'completed', 
          result: `Closest safe shelter: ${shelter}. Route safe of unreinforced masonry structures. ADA ramps verified.`
        } : a));
        setCurrentStep(3);
      }, 2000);
      return () => clearTimeout(t);
    }

    if (currentStep === 3) {
      // Step 3: Translate & Comms Agent runs
      setAgents(prev => prev.map((a, i) => i === 3 ? { ...a, status: 'running' } : a));
      const t = setTimeout(() => {
        setAgents(prev => prev.map((a, i) => i === 3 ? { 
          ...a, 
          status: 'completed', 
          result: `Draft text generated in ${personalContext.language}. Emergency contact parsed. Human validation required.`
        } : a));
        setCurrentStep(4);
      }, 2000);
      return () => clearTimeout(t);
    }

    if (currentStep === 4) {
      // Step 4: Commander Agent synthesizes final command cards
      setAgents(prev => prev.map((a, i) => i === 4 ? { ...a, status: 'running' } : a));
      const t = setTimeout(() => {
        setAgents(prev => prev.map((a, i) => i === 4 ? { 
          ...a, 
          status: 'completed', 
          result: `Command list compiled with 3 hyper-personalized steps in ${personalContext.language}. Layout dispatched.`
        } : a));
        setIsSimulating(false);
        setShowSmsModal(true); // Pop open the approval gate at the very end
      }, 2000);
      return () => clearTimeout(t);
    }

  }, [isSimulating, currentStep, activeHazard, personalContext]);

  // Restart simulation
  const handleTriggerAlert = () => {
    // Reset agent statuses
    setAgents(prev => prev.map(a => ({ ...a, status: 'idle', result: '' })));
    setSmsStatus('idle');
    setShowSmsModal(false);
    setIsSimulating(true);
    setCurrentStep(0);
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

  // Get the drafted message text
  const getDraftedSmsText = () => {
    const lang = personalContext.language;
    if (activeHazard === 'earthquake') {
      if (lang === 'English') return `Alert: Strong quake in Shibuya. We're safe (floor ${personalContext.floor.replace(' Floor', '')}, with child). Heading to Miyashita Park. Tracker: https://saferoute.ai/t/shib`;
      if (lang === 'Chinese') return `警告：涉谷发生强震。我们安全（位于${personalContext.floor}，带孩子）。正撤往宫下公园。追踪链接: https://saferoute.ai/t/shib`;
      if (lang === 'Vietnamese') return `Cảnh báo: Động đất mạnh ở Shibuya. Chúng tôi ổn (tầng ${personalContext.floor.replace(' Floor', '')}, đi cùng con nhỏ). Đang tới Công viên Miyashita. Bản đồ: https://saferoute.ai/t/shib`;
      return `【緊急連絡】渋谷で強い地震。無事です（${personalContext.floor}階・子供同伴）。宮下公園へ移動します。現在地：https://saferoute.ai/t/shib`;
    } else if (activeHazard === 'typhoon') {
      if (lang === 'English') return `Alert: Category 4 Typhoon in Tokyo. Staying inside on floor ${personalContext.floor.replace(' Floor', '')}. Secured. Track: https://saferoute.ai/t/shib`;
      if (lang === 'Chinese') return `警告：台风4级登陆东京。我们在${personalContext.floor}室内避险。一切安好。追踪: https://saferoute.ai/t/shib`;
      if (lang === 'Vietnamese') return `Cảnh báo: Bão Cấp 4 ở Tokyo. Đang trú ẩn ở tầng ${personalContext.floor.replace(' Floor', '')}. An toàn. Định vị: https://saferoute.ai/t/shib`;
      return `【緊急連絡】大型台風接近中。安全に${personalContext.floor}階に留まっています。無事です。GPS：https://saferoute.ai/t/shib`;
    } else {
      if (lang === 'English') return `Alert: Major Tsunami Warning! Evacuating to safe vertical height. Position: Shibuya. Track: https://saferoute.ai/t/shib`;
      if (lang === 'Chinese') return `紧急警报：大海啸预警！我们正前往高处垂直避难。涩谷。追踪: https://saferoute.ai/t/shib`;
      if (lang === 'Vietnamese') return `Cảnh báo khẩn: Sóng thần lớn! Đang sơ tán lên vùng cao an toàn. Shibuya. Định vị: https://saferoute.ai/t/shib`;
      return `【大津波警報】津波から避難するため、高台へ向かっています。現在地：渋谷。URL: https://saferoute.ai/t/shib`;
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
                  { id: 'hazard', label: 'Hazards', emoji: '🚧' }
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
              const marker = (locationMarkers[personalContext.location] || []).find((m: any) => m.id === activeMarker);
              if (!marker) return null;
              const isShelter = marker.category === 'shelter';
              return (
                <div className="absolute top-60 left-4 right-4 z-20 backdrop-blur-md bg-slate-950/85 border border-slate-800 rounded-2xl p-3.5 shadow-2xl animate-in slide-in-from-top-4 duration-300 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">
                        {marker.category === 'shelter' ? '🏥' : marker.category === 'water' ? '⛲' : marker.category === 'medical' ? '🩹' : '🚧'}
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
                          ? (personalContext.location === 'Shibuya' ? 'Miyashita Park Safe Route' : personalContext.location === 'Minato' ? 'Shiba Park Safe Route' : 'Shinjuku Gyoen Safe Route')
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

                  {/* CONFIGURATION / SELECTORS CARD */}
                  <div className="bg-slate-950/60 border border-slate-800/60 rounded-2xl p-3.5 space-y-3">
                    <div className="flex items-center gap-1.5 text-slate-300 pb-1.5 border-b border-slate-900/60">
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span className="text-[10.5px] font-extrabold tracking-wider uppercase font-sans">Disaster Context Setup</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 text-[10.5px]">
                      <div>
                        <label className="text-slate-400 block mb-0.5 uppercase tracking-wide font-bold">Language</label>
                        <select 
                          value={personalContext.language}
                          disabled={isSimulating}
                          onChange={(e) => setPersonalContext({...personalContext, language: e.target.value as PersonalContext['language']})}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-200 px-2 py-1.5 rounded-xl focus:outline-none focus:border-indigo-500/50"
                        >
                          <option value="English">🇬🇧 English</option>
                          <option value="Chinese">🇨🇳 简体中文</option>
                          <option value="Vietnamese">🇻🇳 Tiếng Việt</option>
                          <option value="Japanese">🇯🇵 日本語</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-400 block mb-0.5 uppercase tracking-wide font-bold">Hazard Event</label>
                        <select 
                          value={activeHazard}
                          disabled={isSimulating}
                          onChange={(e) => setActiveHazard(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-200 px-2 py-1.5 rounded-xl focus:outline-none focus:border-indigo-500/50"
                        >
                          <option value="earthquake">🌋 Earthquake</option>
                          <option value="typhoon">🌀 Typhoon</option>
                          <option value="tsunami">🌊 Tsunami</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-400 block mb-0.5 uppercase tracking-wide font-bold">Location</label>
                        <select 
                          value={personalContext.location}
                          disabled={isSimulating}
                          onChange={(e) => setPersonalContext({...personalContext, location: e.target.value as PersonalContext['location']})}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-200 px-2 py-1.5 rounded-xl focus:outline-none"
                        >
                          <option value="Shibuya">Shibuya (渋谷)</option>
                          <option value="Minato">Minato (港区)</option>
                          <option value="Shinjuku">Shinjuku (新宿)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-400 block mb-0.5 uppercase tracking-wide font-bold">Floor Level</label>
                        <select 
                          value={personalContext.floor}
                          disabled={isSimulating}
                          onChange={(e) => setPersonalContext({...personalContext, floor: e.target.value as PersonalContext['floor']})}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-200 px-2 py-1.5 rounded-xl focus:outline-none"
                        >
                          <option value="9th Floor">9th Floor (High)</option>
                          <option value="Ground Floor">Ground Floor (Low)</option>
                          <option value="Basement">Basement</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-400 block mb-0.5 uppercase tracking-wide font-bold">Companions</label>
                        <select 
                          value={personalContext.companions}
                          disabled={isSimulating}
                          onChange={(e) => setPersonalContext({...personalContext, companions: e.target.value as PersonalContext['companions']})}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-200 px-2 py-1.5 rounded-xl focus:outline-none"
                        >
                          <option value="Traveling Solo">Traveling Solo</option>
                          <option value="With a Child">With a Child</option>
                          <option value="With Elderly Parents">With Elderly Parents</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-400 block mb-0.5 uppercase tracking-wide font-bold">Mobility Needs</label>
                        <select 
                          value={personalContext.mobility}
                          disabled={isSimulating}
                          onChange={(e) => setPersonalContext({...personalContext, mobility: e.target.value as PersonalContext['mobility']})}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-200 px-2 py-1.5 rounded-xl focus:outline-none"
                        >
                          <option value="Fully Mobile">Fully Mobile</option>
                          <option value="Wheelchair User">Requires Wheelchair Access</option>
                        </select>
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
                        <span className="text-[9px] font-mono tracking-wider">LIVE DATA</span>
                      </div>
                      <div className="p-3 text-[11px] font-mono leading-relaxed select-text">
                        {activeHazard === 'earthquake' && "千葉県東方沖でマグニチュード7.2の強い地震発生。東京都渋谷区で強い揺れ（震度5強以上）に警戒してください。"}
                        {activeHazard === 'typhoon' && "非常に強い台風が関東地方に接近。渋谷区周辺で最大風速140km/hに達する見込み。不要不急の外出を控えてください。"}
                        {activeHazard === 'tsunami' && "渋谷区沿岸低地等に危険到達。津波予想高3.2m。直ちに高台や避難ビルなどの安全な場所へ避難を開始してください。"}
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
