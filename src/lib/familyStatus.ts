import type { FamilyMember } from '@/lib/familyStore';
import type { ImpactAssessment } from '@/lib/impact';

// One family member's place, judged against the hazard from the current run.
//
// Produced by the pipeline rather than computed in the panel, so "check my
// family" is genuinely part of pressing the emergency button — not something
// that only happens if the drawer happens to be open.
export interface FamilyStatus {
  member: FamilyMember;
  impact: ImpactAssessment;
}
