// ─────────────────────────────────────────────────────────────────────────────
// Map pin artwork.
//
// Every POI used to be the same flat teardrop in a category colour at one fixed
// size, so eighty of them turned the map into confetti: nothing said which pin
// was a shelter rather than a convenience store, which one the route was
// heading for, or which one had just been tapped.
//
// These are inline SVG data URIs rather than google.maps.Symbol paths, because
// a Symbol is one path in one fill — no glyph, no shadow, no contrast ring. No
// image assets are shipped: the markup is built here and handed straight to the
// Marker, so this stays client-only like the rest of the app.
// ─────────────────────────────────────────────────────────────────────────────

export type MarkerCategory = 'shelter' | 'water' | 'medical' | 'station';

/** `target` is where the evacuation route leads; `active` is the tapped pin. */
export type MarkerState = 'default' | 'target' | 'active';

export interface MarkerIcon {
  url: string;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
  /**
   * Animated artwork has to stay a real DOM node. Google's optimised marker
   * path rasterises each icon once onto a shared canvas, which freezes the
   * pulse on the first frame.
   */
  animated: boolean;
}

interface CategoryArt {
  /** Fill of the pin head. */
  color: string;
  /** Lighter gradient stop, so the head reads as a dome and not a sticker. */
  light: string;
  /** 24×24 glyph, knocked out in white inside the head. */
  glyph: string;
}

// Colours are unchanged from the previous pins — people who have used the map
// before should not have to relearn what green means.
const CATEGORY_ART: Record<MarkerCategory, CategoryArt> = {
  shelter: {
    color: '#059669',
    light: '#34d399',
    // A house with its door open, not a hospital cross: this is somewhere to go into.
    glyph: 'M11.3 2.9 2.6 10.1a1.1 1.1 0 0 0 1.4 1.7l.6-.5V20a1 1 0 0 0 1 1h3.9v-6h5v6h3.9a1 1 0 0 0 1-1v-8.7l.6.5a1.1 1.1 0 0 0 1.4-1.7l-8.7-7.2a1.1 1.1 0 0 0-1.4 0Z'
  },
  water: {
    color: '#0284c7',
    light: '#38bdf8',
    glyph: 'M12 2.7C7.8 7.7 5.4 10.9 5.4 14a6.6 6.6 0 0 0 13.2 0c0-3.1-2.4-6.3-6.6-11.3Z'
  },
  medical: {
    color: '#9333ea',
    light: '#c084fc',
    glyph: 'M10 2.6h4a1 1 0 0 1 1 1V9h5.4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H15v5.4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V15H3.6a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1H9V3.6a1 1 0 0 1 1-1Z'
  },
  station: {
    color: '#d97706',
    light: '#fbbf24',
    // Windows and wheels are knockouts — see fill-rule="evenodd" below.
    glyph: 'M12 2.2c-3.2 0-6.4.4-6.4 3.6v8.3a3.3 3.3 0 0 0 3.3 3.3l-1.6 1.7v.5h9.4v-.5l-1.6-1.7a3.3 3.3 0 0 0 3.3-3.3V5.8c0-3.2-3.2-3.6-6.4-3.6ZM7.9 6.3h8.2v4.2H7.9V6.3Zm1.4 8.6a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Zm5.4 0a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Z'
  }
};

const UNKNOWN_ART: CategoryArt = {
  color: '#0891b2',
  light: '#67e8f9',
  glyph: 'M12 6.4A5.6 5.6 0 1 0 12 17.6 5.6 5.6 0 0 0 12 6.4Z'
};

// Authoring canvas. The pin head is centred at (24,18) with radius 14 and the
// tip sits at (24,44); the rest is headroom for the pulse ring and the shadow.
const VB_W = 48;
const VB_H = 52;
const TIP_Y = 44;

/** Material's "place" outline, doubled into the 48-unit canvas. */
const PIN_PATH =
  'M24 4C16.3 4 10 10.3 10 18c0 10.5 14 26 14 26s14-15.5 14-26c0-7.7-6.3-14-14-14Z';

// Shelters carry the weight; the supporting categories sit a step back. Every
// pin used to be drawn at one size, which is half of why a screen with eighty
// of them said nothing about where to go.
const BASE_WIDTH: Record<MarkerCategory | 'unknown', number> = {
  shelter: 31,
  water: 26,
  medical: 27,
  station: 26,
  unknown: 26
};

const STATE_SCALE: Record<MarkerState, number> = {
  default: 1,
  target: 1.18,
  active: 1.36
};

function encode(markup: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(markup)}`;
}

function pinMarkup(art: CategoryArt, state: MarkerState): string {
  // A single pulse on the pin the route leads to. One pin, not eighty — an
  // animated crowd would be noise, and this one is the instruction.
  const pulse = state === 'target'
    ? `<circle cx="24" cy="18" r="14" fill="none" stroke="${art.color}" stroke-width="2.5">
         <animate attributeName="r" values="13;22" dur="1.9s" repeatCount="indefinite"/>
         <animate attributeName="opacity" values=".6;0" dur="1.9s" repeatCount="indefinite"/>
       </circle>`
    : '';

  // The tapped pin gets a halo instead of a pulse: it is a state, not an alarm.
  // The ring keeps a hard edge on it, so selection survives a busy basemap.
  const halo = state === 'active'
    ? `<circle cx="24" cy="18" r="20" fill="${art.color}" opacity=".18"/>
       <circle cx="24" cy="18" r="19" fill="none" stroke="${art.color}" stroke-width="1.6" opacity=".6"/>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB_W} ${VB_H}">
  <defs>
    <linearGradient id="f" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${art.light}"/>
      <stop offset="1" stop-color="${art.color}"/>
    </linearGradient>
    <filter id="s" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="1.5"/>
    </filter>
  </defs>
  <ellipse cx="24" cy="46.5" rx="6" ry="2.2" fill="#0f172a" opacity=".3" filter="url(#s)"/>
  ${halo}
  ${pulse}
  <path d="${PIN_PATH}" fill="url(#f)" stroke="#ffffff" stroke-width="2.4" stroke-linejoin="round"/>
  <g transform="translate(15.5 9.5) scale(.708)">
    <path d="${art.glyph}" fill="#ffffff" fill-rule="evenodd"/>
  </g>
</svg>`;
}

/**
 * Artwork for one POI pin. `width` and `height` are CSS pixels; the anchor is
 * the tip of the pin, so the point sits exactly on its coordinates.
 */
export function poiMarkerIcon(category: string, state: MarkerState = 'default'): MarkerIcon {
  const art = CATEGORY_ART[category as MarkerCategory] ?? UNKNOWN_ART;
  const base = BASE_WIDTH[category as MarkerCategory] ?? BASE_WIDTH.unknown;
  const width = base * STATE_SCALE[state];

  return {
    url: encode(pinMarkup(art, state)),
    width,
    height: width * (VB_H / VB_W),
    anchorX: width / 2,
    anchorY: width * (TIP_Y / VB_W),
    animated: state === 'target'
  };
}

/**
 * "You are here": a solid core inside a white ring, with a slow sonar ring so
 * the dot stays findable on a map covered in pins.
 */
export function userDotIcon(): MarkerIcon {
  const size = 40;
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <defs>
    <filter id="s" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="1.6"/>
    </filter>
  </defs>
  <circle cx="20" cy="20" r="7" fill="none" stroke="#2563eb" stroke-width="2">
    <animate attributeName="r" values="7;17" dur="2.4s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values=".45;0" dur="2.4s" repeatCount="indefinite"/>
  </circle>
  <circle cx="20" cy="21" r="8.5" fill="#0f172a" opacity=".28" filter="url(#s)"/>
  <circle cx="20" cy="20" r="8.5" fill="#ffffff"/>
  <circle cx="20" cy="20" r="5.6" fill="#2563eb"/>
</svg>`;

  return {
    url: encode(markup),
    width: size,
    height: size,
    anchorX: size / 2,
    anchorY: size / 2,
    animated: true
  };
}
