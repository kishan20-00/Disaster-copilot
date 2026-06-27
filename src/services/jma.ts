import type { Hazard, HazardSignal } from './gemini';

const JMA_QUAKE_LIST = 'https://www.jma.go.jp/bosai/quake/data/list.json';

interface JmaQuakeListEntry {
  ttl?: string;
  cod?: string;
  anm?: string;
  mag?: string;
  maxi?: string;
  at?: string;
  ift?: string;
  ctt?: string;
  ser?: string;
  json?: string;
  eid?: string;
}

export async function fetchLatestQuake(): Promise<HazardSignal | null> {
  try {
    const res = await fetch(JMA_QUAKE_LIST, { cache: 'no-store' });
    if (!res.ok) return null;
    const list = (await res.json()) as JmaQuakeListEntry[];
    const latest = list?.[0];
    if (!latest) return null;

    const mag = latest.mag ? parseFloat(latest.mag) : undefined;
    const intensity = latest.maxi || undefined;
    const epicenter = latest.anm || 'Unknown epicenter';
    const headline = `M${latest.mag ?? '?.?'} earthquake near ${epicenter}, JMA intensity ${intensity ?? 'N/A'}`;
    const bulletinJa = latest.ttl
      ? `${latest.ttl}：${epicenter}付近でマグニチュード${latest.mag ?? '?.?'}の地震。最大震度${intensity ?? '不明'}。`
      : `${epicenter}付近でマグニチュード${latest.mag ?? '?.?'}の地震が発生。最大震度${intensity ?? '不明'}。`;
    const bulletinEn = `${latest.ttl ?? 'Earthquake'} near ${epicenter}. Magnitude ${latest.mag ?? '?.?'}, max JMA intensity ${intensity ?? 'N/A'}.`;

    return {
      hazard: 'earthquake',
      headline,
      bulletinJa,
      bulletinEn,
      magnitude: mag,
      intensity,
      source: 'JMA (jma.go.jp/bosai/quake)'
    };
  } catch (err) {
    console.warn('JMA fetch failed; falling back to local bulletin.', err);
    return null;
  }
}

export async function fetchHazardSignal(hazard: Hazard, location: string): Promise<HazardSignal | null> {
  if (hazard === 'earthquake') {
    return fetchLatestQuake();
  }
  if (hazard === 'typhoon') {
    return {
      hazard,
      headline: `Strong typhoon approaching Kanto region near ${location}`,
      bulletinJa: `関東地方に非常に強い台風が接近中。${location}周辺で暴風と豪雨に厳重警戒してください。`,
      bulletinEn: `Severe typhoon approaching Kanto near ${location}. Stay indoors and away from windows.`,
      source: 'Simulated bulletin (JMA typhoon feed not wired)'
    };
  }
  return {
    hazard,
    headline: `Major tsunami warning for Tokyo Bay near ${location}`,
    bulletinJa: `東京湾沿岸に大津波警報。${location}周辺は直ちに高台へ避難してください。`,
    bulletinEn: `Major tsunami warning for Tokyo Bay near ${location}. Move to high ground immediately.`,
    source: 'Simulated bulletin (JMA tsunami feed not wired)'
  };
}
