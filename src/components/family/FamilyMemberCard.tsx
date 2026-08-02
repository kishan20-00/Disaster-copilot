import { Navigation, MessageSquareWarning, Phone, MapPin, Clock, Crosshair, Trash2 } from 'lucide-react';
import type { FamilyMember } from '@/lib/familyStore';
import { describeAge } from '@/lib/familyStore';
import type { ImpactAssessment, ThreatScanState } from '@/lib/impact';
import { fmtKm } from '@/lib/impact';
import { familyVerdict } from '@/lib/familyStatus';
import { hazardInfo, hazardLabel } from '@/constants/hazards';
import type { LatLng } from '@/services/geolocation';
import { haversineMeters } from '@/services/maps';
import { useT } from '@/i18n/context';

/**
 * Both distance chips share this so they read as one scale. `formatDistance` is
 * tuned for walking ranges and renders a cross-ocean gap as "2755.8km" — a
 * decimal that claims precision the number does not have, and one that looked
 * wrong beside the hazard chip's "1193 km".
 */
const distanceLabel = (meters: number): string =>
  meters < 950 ? `${Math.round(meters)} m` : fmtKm(meters / 1000);

interface FamilyMemberCardProps {
  member: FamilyMember;
  /** Verdict for this member's place from the last run, or null. */
  impact: ImpactAssessment | null;
  scanStatus: ThreatScanState['status'] | null;
  /** The device's own position, for the "from you" distance. */
  livePosition: LatLng | null;
  onViewOnMap: () => void;
  onOpenSms: () => void;
  onRemove: () => void;
}

// One family member, as a card.
//
// The layout follows the supplied design closely — status accent down the left
// edge, avatar, name with a state pill, a row of three metric chips, a meter,
// and a three-action footer. What differs is what the chips and the meter are
// allowed to say.
//
// The design's chips were battery percentage, cell generation (5G/LTE) and
// movement speed, and the meter was "60% of the way to Shelter A". None of that
// is obtainable: no web API reports another person's battery, radio or speed,
// and no Google API exposes a family member's position at all — Family Link has
// no developer API and Maps location sharing is not published. An earlier
// version of this screen displayed exactly those fields anyway, with invented
// numbers, and they were deleted for it (see familyStore.ts).
//
// So the three chips carry the three things that ARE computable and useful, and
// the meter shows assessed hazard severity for the place rather than a journey
// nobody is tracking. Same shape, same glanceability, no fiction.
export function FamilyMemberCard({
  member, impact, scanStatus, livePosition, onViewOnMap, onOpenSms, onRemove
}: FamilyMemberCardProps) {
  const t = useT();
  const verdict = familyVerdict(impact, scanStatus);

  // Distance from the user to the place they recorded. Real geometry, and the
  // question people actually ask first: how far away is that from me?
  const fromYou = livePosition
    ? distanceLabel(haversineMeters(livePosition, { lat: member.place.lat, lng: member.place.lng }))
    : null;

  const initials = member.name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const hazard = impact ? hazardInfo(impact.hazard) : null;

  return (
    <article className="relative bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Status accent. The design's clearest idea: the card's state is legible
          from the edge alone, before any text is read. */}
      <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${verdict.tone.accent}`} aria-hidden="true" />

      <div className="pl-4 pr-3 py-3 space-y-3">
        {/* ── Identity row ── */}
        <div className="flex items-start gap-3">
          {/* No photo is stored for a family member and none is fetched, so the
              design's avatar becomes initials. A remote avatar service would
              mean shipping a name to a third party for decoration. */}
          <span className="w-11 h-11 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
            <span className="text-[13px] font-black text-indigo-600 tracking-tight">{initials}</span>
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-black text-slate-900 tracking-tight truncate">{member.name}</h3>
              <span className={`shrink-0 w-2 h-2 rounded-full ${verdict.tone.dot}`} aria-hidden="true" />
            </div>
            <p className="text-[10px] font-mono text-slate-500 truncate">{member.relation}</p>
          </div>

          <button
            onClick={onRemove}
            className="shrink-0 p-1.5 -mr-1 text-slate-300 hover:text-red-500 transition"
            title={t('card.remove', { name: member.name })}
            aria-label={t('card.remove', { name: member.name })}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── Verdict pill + the place it applies to ── */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[9.5px] font-black uppercase tracking-wide px-2 py-1 rounded-lg ${verdict.tone.pill}`}>
            {hazard && verdict.atRisk ? `${hazard.emoji} ${verdict.label}` : verdict.label}
          </span>
          {/* "Expected" is load-bearing, not hedging: this is where the user said
              they would be, not where anyone has been observed. */}
          <span className="text-[10px] font-mono text-slate-600 truncate min-w-0">
            {t('card.expectedAt', { place: member.place.name })}
          </span>
        </div>

        {/* ── Metric chips: the honest counterparts of battery / signal / speed ── */}
        <div className="grid grid-cols-3 gap-1.5">
          <Chip Icon={MapPin} label={t('card.fromYou')} value={fromYou ?? '—'} />
          <Chip
            Icon={Crosshair}
            label={impact ? t('card.fromHazard', { hazard: hazardLabel(impact.hazard).toLowerCase() }) : t('card.fromHazardGeneric')}
            value={impact?.distanceKm != null ? fmtKm(impact.distanceKm) : '—'}
          />
          <Chip Icon={Clock} label={t('card.recorded')} value={describeAge(member.addedAt)} />
        </div>

        {/* ── Severity meter ──
            The design put route progress here. This is the assessed severity for
            the place instead: five discrete steps, because the underlying value
            IS categorical — drawing it as a percentage would invent precision
            the assessment does not have. */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400">{t('card.assessedSeverity')}</span>
            <span className={`text-[9.5px] font-black uppercase tracking-wide ${verdict.tone.text}`}>
              {impact ? t(`severity.${impact.severity}`) || '—' : '—'}
            </span>
          </div>
          <div
            className="flex gap-1"
            role="img"
            aria-label={t('card.severityAria', {
              level: impact ? t(`severity.${impact.severity}`) || t('card.notAssessed') : t('card.notAssessed')
            })}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < verdict.severityLevel ? verdict.tone.meter : 'bg-slate-100'
                }`}
              />
            ))}
          </div>
          <p className={`text-[9.5px] font-mono leading-snug ${verdict.tone.text}`}>{verdict.note}</p>
        </div>

        {/* ── Actions ──
            Three buttons as designed, but each one does something real: focus the
            map on the place, open the human-approval message gate, or dial a
            number the user typed in. */}
        <div className="grid grid-cols-3 gap-2 pt-0.5">
          <button
            onClick={onViewOnMap}
            className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95 transition"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span className="text-[9px] font-black uppercase tracking-wide leading-none">{t('card.showPlace')}</span>
          </button>

          <button
            onClick={onOpenSms}
            className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 active:scale-95 transition"
          >
            <MessageSquareWarning className="w-3.5 h-3.5" />
            <span className="text-[9px] font-black uppercase tracking-wide leading-none">{t('card.message')}</span>
          </button>

          {/* A dead button is worse than an absent one, so with no number stored
              this states what is missing instead of pretending it can dial. */}
          {member.phone ? (
            <a
              href={`tel:${member.phone.replace(/[^+\d]/g, '')}`}
              className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 active:scale-95 transition"
            >
              <Phone className="w-3.5 h-3.5" />
              <span className="text-[9px] font-black uppercase tracking-wide leading-none">{t('card.call')}</span>
            </a>
          ) : (
            <span
              className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-400"
              title={t('card.noNumberTitle')}
            >
              <Phone className="w-3.5 h-3.5" />
              <span className="text-[9px] font-black uppercase tracking-wide leading-none">{t('card.noNumber')}</span>
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function Chip({ Icon, label, value }: { Icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 flex flex-col gap-0.5 min-w-0">
      <span className="flex items-center gap-1 text-slate-400">
        <Icon className="w-2.5 h-2.5 shrink-0" />
        <span className="text-[8px] font-mono uppercase tracking-wide truncate">{label}</span>
      </span>
      <span className="text-[11px] font-black text-slate-800 tracking-tight truncate">{value}</span>
    </div>
  );
}
