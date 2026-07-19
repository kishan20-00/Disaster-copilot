import { locationMarkers } from '@/constants/locationMarkers';

interface SvgFallbackMapProps {
  location: 'Shibuya' | 'Minato' | 'Shinjuku';
  filterCategory: 'all' | 'shelter' | 'water' | 'medical' | 'station';
  searchQuery: string;
  mapLayer: 'streets' | 'satellite' | 'terrain' | 'traffic' | 'hazard';
  currentStep: number;
  activeMarker: string | null;
  onSelectMarker: (id: string) => void;
}

// Hand-drawn SVG map used when Google Maps has no key / is offline.
export function SvgFallbackMap({
  location, filterCategory, searchQuery, mapLayer, currentStep, activeMarker, onSelectMarker
}: SvgFallbackMapProps) {
  // Extract current markers based on category filter and search query
  const currentMarkers = (locationMarkers[location] || []).filter((m: any) => {
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
  }[location];

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
        {location === 'Shibuya' && (
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

        {location === 'Minato' && (
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

        {location === 'Shinjuku' && (
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
          {location === 'Shibuya' && (
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

          {location === 'Minato' && (
            <>
              <path d="M 50 150 L 340 650" stroke={mapLayer === 'traffic' ? '#10b981' : '#475569'} strokeWidth="4" strokeLinecap="round" />
              <path d="M 50 650 L 340 150" stroke={mapLayer === 'traffic' ? '#f59e0b' : '#475569'} strokeWidth="4" strokeLinecap="round" />
              <path d="M 195 50 L 195 780" stroke={mapLayer === 'traffic' ? '#ef4444' : '#334155'} strokeWidth="3" strokeLinecap="round" />
              <path d="M 50 400 L 350 400" stroke={mapLayer === 'traffic' ? '#10b981' : '#334155'} strokeWidth="3" strokeLinecap="round" />
            </>
          )}

          {location === 'Shinjuku' && (
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
            {location === 'Shibuya' && (
              <circle cx="100" cy="450" r="45" fill="url(#hazardGrad)" className="animate-pulse" opacity="0.35" />
            )}
            {location === 'Minato' && (
              <circle cx="150" cy="580" r="50" fill="url(#hazardGrad)" className="animate-pulse" opacity="0.35" />
            )}
            {location === 'Shinjuku' && (
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
              onClick={() => onSelectMarker(marker.id)}
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
}
