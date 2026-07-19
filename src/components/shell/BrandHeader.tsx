import { Shield } from 'lucide-react';

// Desktop-only brand header shown above the device mockup.
export function BrandHeader() {
  return (
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
  );
}
