// Demo family members for Safety Guard Dashboard. Positions are small deterministic
// offsets from the user's live GPS position (see useGoogleMaps), so the demo appears
// near the user anywhere in the world.
export const FAMILY_MEMBERS = [
  { id: 'f1', name: 'Yuki (Child)',   status: 'safe',     color: '#22c55e', dLat:  0.0012, dLng:  0.0009, lastSeen: '2 min ago'  },
  { id: 'f2', name: 'Hana (Partner)', status: 'safe',     color: '#22c55e', dLat: -0.0008, dLng:  0.0014, lastSeen: '5 min ago'  },
  { id: 'f3', name: 'Kenji (Parent)', status: 'awaiting', color: '#f59e0b', dLat: -0.0015, dLng: -0.0007, lastSeen: '12 min ago' },
];
