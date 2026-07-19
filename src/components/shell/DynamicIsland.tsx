// iOS Dynamic Island status chrome (cosmetic).
export function DynamicIsland() {
  return (
    <div className="absolute top-0 inset-x-0 h-10 flex items-center justify-center z-50 pointer-events-none">
      <div className="w-28 h-6 bg-black rounded-full flex items-center justify-between px-3.5">
        <span className="text-[10px] text-emerald-400 font-bold tracking-tight">12:30</span>
        <div className="flex gap-1.5 items-center">
          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></span>
          <span className="text-[9px] text-slate-400 font-medium font-sans">5G</span>
        </div>
      </div>
    </div>
  );
}
