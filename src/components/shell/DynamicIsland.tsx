// A cosmetic notch for the desktop device mockup only.
//
// It used to display "12:30" and "5G" — both invented, and both nonsense on a
// real phone, which already has a genuine clock and signal indicator a few pixels
// above. So the fake readouts are gone, and the pill is hidden on mobile where
// the real Dynamic Island lives.
export function DynamicIsland() {
  return (
    <div className="absolute top-0 inset-x-0 h-10 hidden sm:flex items-center justify-center z-50 pointer-events-none">
      <div className="w-28 h-6 bg-black rounded-full" />
    </div>
  );
}
