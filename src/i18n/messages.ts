import type { Language } from '@/types/domain';

// ─────────────────────────────────────────────────────────────────────────────
// The UI message catalogue.
//
// This replaces `constants/languages.ts`, which held seven keys — three of them
// never rendered — and reached only three components. Everything else in the app
// was hardcoded English, so switching language changed a scan button, a heading
// and the SMS gate, and nothing else.
//
// English is the source of truth: `MessageKey` is derived from it, and every
// other catalogue is typed as a complete `Record<MessageKey, string>`. Adding a
// key to English and forgetting to translate it is therefore a COMPILE ERROR,
// not a string that silently renders in English on a Japanese screen. That
// property is the whole point — a half-translated emergency app is worse than an
// honestly monolingual one, and it cannot be maintained by vigilance alone.
//
// Keys are dotted and grouped by surface (`nav.*`, `sms.*`) so the catalogue
// stays navigable as it grows to cover the rest of the app.
//
// Interpolation: write `{name}` in the message and pass `t('key', { name })`.
// ─────────────────────────────────────────────────────────────────────────────

const EN = {
  // Bottom tab bar
  'nav.home': 'Home',
  'nav.navigate': 'Navigate',
  'nav.family': 'Family',
  'nav.alerts': 'Alerts',

  // Standby panel (map drawer, no alert running)
  'standby.title': 'SafeRoute AI Evacuation Assistant',
  'standby.blurb':
    'Checks JMA (earthquake, tsunami, typhoon) and the USGS worldwide catalog, then works out whether anything found actually reaches your position. Nothing is triggered unless it does.',
  'standby.trigger': 'Scan For Live Threats',

  // Action cards (the final "do this now" list)
  'actions.heading': 'DO THIS NOW',
  'actions.routeReady': 'Safe Route Formulated',

  // SMS approval gate. One key for both the gate's own header and the link that
  // opens it, because they name the same thing and drifted apart once already.
  'sms.gate.title': 'Human-in-the-Loop Gate',
  'sms.gate.subtitle': 'Emergency Approval Gate',
  'sms.preview.label': 'Emergency message',
  'sms.preview.draft': 'DRAFT',
  'sms.preview.gpsIncluded': 'Live GPS link included',
  'sms.hold': 'Hold / Edit',
  'sms.copy': 'Copy Message',
  'sms.copied': 'Message copied — paste into your SMS app'
} as const;

/** Every translatable string in the app is one of these. */
export type MessageKey = keyof typeof EN;

/** A complete catalogue. Missing a key here fails the type check. */
export type Catalogue = Record<MessageKey, string>;

const JA: Catalogue = {
  'nav.home': 'ホーム',
  'nav.navigate': 'ナビ',
  'nav.family': '家族',
  'nav.alerts': '警報',

  'standby.title': 'SafeRoute AI 避難アシスタント',
  'standby.blurb':
    '気象庁（地震・津波・台風）とUSGSの世界カタログを確認し、検出された事象が実際にあなたの位置に到達するかを判定します。到達しない限り、警報は発動しません。',
  'standby.trigger': '最新の災害情報をスキャン',

  'actions.heading': '今すぐ実行すべき行動',
  'actions.routeReady': '安全な避難経路を確定しました',

  'sms.gate.title': 'ヒューマン・ゲートウェイ',
  'sms.gate.subtitle': '緊急送信の承認ゲート',
  'sms.preview.label': '緊急メッセージ',
  'sms.preview.draft': '下書き',
  'sms.preview.gpsIncluded': '現在地リンクを含みます',
  'sms.hold': '保留・編集',
  'sms.copy': 'メッセージをコピー',
  'sms.copied': 'メッセージをコピーしました — SMSアプリに貼り付けて送信'
};

const ZH: Catalogue = {
  'nav.home': '主页',
  'nav.navigate': '导航',
  'nav.family': '家人',
  'nav.alerts': '警报',

  'standby.title': 'SafeRoute AI 疏散助手',
  'standby.blurb':
    '检查日本气象厅（地震、海啸、台风）与美国地质调查局全球目录，然后判断检测到的事件是否真的会影响您所在的位置。只有确认会影响时才会触发警报。',
  'standby.trigger': '扫描实时灾害警报',

  'actions.heading': '立即执行以下操作',
  'actions.routeReady': '已确定安全撤离路线',

  'sms.gate.title': '人工审批网关',
  'sms.gate.subtitle': '紧急发送审批关卡',
  'sms.preview.label': '紧急消息',
  'sms.preview.draft': '草稿',
  'sms.preview.gpsIncluded': '已包含实时定位链接',
  'sms.hold': '暂缓 / 编辑',
  'sms.copy': '复制消息',
  'sms.copied': '消息已复制 — 请粘贴到短信应用发送'
};

const VI: Catalogue = {
  'nav.home': 'Trang chính',
  'nav.navigate': 'Dẫn đường',
  'nav.family': 'Gia đình',
  'nav.alerts': 'Cảnh báo',

  'standby.title': 'Trợ lý Sơ tán SafeRoute AI',
  'standby.blurb':
    'Kiểm tra JMA (động đất, sóng thần, bão) và danh mục toàn cầu của USGS, sau đó xác định xem sự kiện được phát hiện có thực sự ảnh hưởng đến vị trí của bạn hay không. Không có gì được kích hoạt trừ khi điều đó xảy ra.',
  'standby.trigger': 'Quét Cảnh Báo Thảm Họa',

  'actions.heading': 'HÀNH ĐỘNG NGAY',
  'actions.routeReady': 'Đã xác định tuyến đường an toàn',

  'sms.gate.title': 'Cổng Phê Duyệt Nhân Sự',
  'sms.gate.subtitle': 'Cổng phê duyệt khẩn cấp',
  'sms.preview.label': 'Tin nhắn khẩn cấp',
  'sms.preview.draft': 'BẢN NHÁP',
  'sms.preview.gpsIncluded': 'Đã kèm liên kết vị trí trực tiếp',
  'sms.hold': 'Giữ lại / Sửa',
  'sms.copy': 'Sao chép tin nhắn',
  'sms.copied': 'Đã sao chép — dán vào ứng dụng SMS để gửi'
};

export const CATALOGUES: Record<Language, Catalogue> = {
  English: EN,
  Japanese: JA,
  Chinese: ZH,
  Vietnamese: VI
};

/** Values substituted into `{placeholder}` slots. */
export type MessageVars = Record<string, string | number>;

/**
 * Look a key up in `lang`, falling back to English if the catalogue somehow
 * lacks it at runtime (it cannot at compile time, but a catalogue could be
 * hand-edited) and to the key itself as a last resort — a visible key is a bug
 * report, whereas an empty string is a silently blank screen.
 */
export function translate(lang: Language, key: MessageKey, vars?: MessageVars): string {
  const raw = CATALOGUES[lang]?.[key] ?? EN[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match
  );
}
