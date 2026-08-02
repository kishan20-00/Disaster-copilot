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
//
// NEVER TRANSLATE these, in any catalogue: the product name "SafeRoute AI" and
// its subtitle 安心避難, and the source and unit names JMA, USGS, GDACS, GSI,
// GPS, SMS, MMI, PAGER, ShakeMap. They are proper nouns; a translated "JMA" is
// no longer traceable to the agency that issued the bulletin.
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
  'sms.copied': 'Message copied — paste into your SMS app',

  // Splash + desktop brand header. "SafeRoute AI" and 安心避難 are the product
  // name and never translated — see the do-not-translate note at the top.
  'splash.skip': 'Tap to skip',
  'splash.skipLabel': 'Skip introduction',
  'brand.tagline': 'A multi-agent disaster co-pilot with a strict human-approval safety gate.',

  // Map: focus banner, marker popup, search, category chips, AR overlay
  'focus.title': 'Checking another place',
  'focus.note': 'Not your location — routes shown are from here',
  'focus.back': 'Back to me',
  'marker.accessibilityUnknown': 'Accessibility unverified',
  'marker.navigate': 'Navigate Route',
  'search.placeholder': 'Check another place…',
  'search.placeholderNear': 'Check another place near {place}…',
  'search.profile': 'Profile and settings',
  'category.all': 'All',
  'category.shelter': 'Shelters',
  'category.water': 'Water',
  'category.medical': 'Medical',
  'category.station': 'Stations',
  'ar.standby': 'Trigger alert to activate AR navigation',
  'ar.alertSuffix': 'ALERT',

  // Right-hand map control rail (tooltips only — the controls are icons)
  'controls.layers': 'Map Layers',
  'controls.recenter': 'Recenter Map',
  'controls.voice': 'Audio Co-pilot Guidance',
  'controls.camera': 'AR Camera View',
  'controls.sos': 'Trigger Emergency Advisory',
  'layer.streets': 'Vector Map',
  'layer.satellite': 'Satellite',
  'layer.traffic': 'Live Traffic',
  'layer.hazard': 'Hazard Feed',

  // Location gate. The `denied` recovery steps name real OS menu items, so each
  // catalogue must use that platform's OWN wording for them — a literal
  // translation of "Settings → Safari → Location" is unfollowable, on the one
  // screen whose entire job is unblocking someone who cannot use the app.
  'location.maps.title': 'Maps unavailable',
  'location.maps.body': 'SafeRoute AI needs the Google Maps service to find shelters and routes near you. Check your connection, or configure VITE_GOOGLE_MAPS_API_KEY.',
  'location.pending.title': 'Locating you…',
  'location.pending.body': 'Getting your position to map nearby shelters, water and medical points. Indoors this can take a few seconds while it falls back to a network fix.',
  'location.denied.title': 'Location is blocked',
  'location.denied.body': 'Your browser is refusing the request, which is why nothing happens when you tap. It has to be re-allowed in settings — the app cannot ask again on its own.',
  'location.denied.step1': 'Safari on iPhone: tap the page-settings icon at the left of the address bar, then Website Settings → Location → Ask or Allow.',
  'location.denied.step2': 'If that option is not there: Settings → Safari (listed under “Apps” on newer iOS) → Location → Ask.',
  'location.denied.step3': 'Added to your Home Screen? Settings → SafeRoute AI → Location → While Using the App.',
  'location.denied.step4': 'Also check Settings → Privacy & Security → Location Services is switched on.',
  'location.insecure.title': 'Needs a secure connection',
  'location.insecure.body': 'Browsers only give location to pages served over HTTPS. Open the https:// address for this site — on http it can never work, however many times you tap.',
  'location.timeout.title': 'Location is taking too long',
  'location.timeout.body': 'Your device could not get a fix in time, even after retrying at reduced accuracy. That is normal deep inside buildings, basements and trains.',
  'location.timeout.step1': 'Move near a window or step outside, then try again.',
  'location.timeout.step2': 'Turn Wi-Fi on — it speeds up positioning even when you are not connected to a network.',
  'location.unavailable.title': 'Position unavailable',
  'location.unavailable.body': 'The device reported that it cannot work out a position at the moment.',
  'location.unavailable.step1': 'Check Location Services is enabled for your device.',
  'location.unavailable.step2': 'Switch Airplane Mode off if it is on.',
  'location.unsupported.title': 'Not supported here',
  'location.unsupported.body': 'This browser does not offer location at all. Try Safari or Chrome.',
  'location.default.title': 'Enable location',
  'location.default.body': 'SafeRoute AI works from your real position. Allow location access so it can check live hazards against where you actually are.',
  'location.retry': 'Try again',
  'location.retryAllowed': 'I’ve allowed it — try again',

  // Alerts page
  'alerts.title': 'Live Alerts',
  'alerts.subtitle': 'Live updates in your area',
  'alerts.rescan': 'Rescan',
  'alerts.rescanning': 'Scanning',
  'alerts.rescanTitle': 'Rescan hazard feeds',
  'alerts.noScan': 'No scan yet. Run a safety check to see live events near you.',
  'alerts.scanningBody': 'Scanning live hazard feeds…',
  'alerts.unavailable': 'No hazard feed could be reached, so this is not an all-clear. Retry once you have a connection.',
  'alerts.none': 'No recent events found near you.',
  'alerts.actingOnThis': 'Acting on this',
  'alerts.away': '{distance} away',
  'alerts.distanceUnknown': 'distance unknown',
  'response.evacuate': 'Evacuate',
  'response.shelter_in_place': 'Shelter in place',
  'response.monitor': 'Monitor',

  // Voice panel. The example words in `voice.hint` must be words the recogniser
  // actually matches in that language — see useVoiceAssistant's keyword lists.
  'voice.active': 'Voice Assistant & Control Active',
  'voice.fallbackTitle': 'Route ready',
  'voice.fallbackDesc': 'Follow the highlighted paths.',
  'voice.analyzing': 'Analyzing situation. Stand by for evacuation instructions.',
  'voice.standby': 'Standing by. Speak to customize your profile or say “trigger”.',
  'voice.listening': 'Listening…',
  'voice.tapToSpeak': 'Tap to Speak',
  'voice.heard': 'Heard: “{text}”',
  'voice.hint': 'Say “wheelchair”, “3rd floor”, “trigger”…',
  'voice.ready': 'Voice control ready…',

  // Hazard advisory card
  'advisory.awaitingFeed': 'AWAITING FEED',
  'advisory.original': 'Original (JMA)',
  'advisory.fetching': 'Fetching the official bulletin…',

  // Live telemetry card
  'telemetry.title': 'Live Telemetry',
  'telemetry.viewingElsewhere': 'VIEWING ELSEWHERE',
  'telemetry.gpsLocked': 'GPS LOCKED',
  'telemetry.awaitingGps': 'AWAITING GPS',
  'telemetry.checking': 'Checking',
  'telemetry.youAreAt': 'You are at',
  'telemetry.acquiring': 'Acquiring device location…',
  'telemetry.nearestShelter': 'Nearest shelter',
  'telemetry.awaitingPlaces': 'Awaiting Places data…',
  'telemetry.straightLine': '{distance} away · straight line',
  'telemetry.official': '✓ officially designated for this hazard',
  'telemetry.unofficial': '⚠ no official register here — nearby place, not a shelter',
  'telemetry.walkingRoute': 'Walking route',
  'telemetry.routeSummary': '{distance} · ETA {duration}',

  // Family summary row in the map drawer
  'guard.title': 'Family places',
  'guard.noneAdded': 'No one added yet',
  'guard.inAffected': '{count} in affected area',
  'guard.noneAffected': 'None in affected area',

  // Agent pipeline console
  'agents.title': 'Multi-Agent Pipeline Logs',
  'agents.thinking': 'Thinking',
  'agents.ready': 'Ready',
  'agents.pending': 'Pending',

  // Severity words. Rendered in two places (alerts list and scan panel) from the
  // Severity union in lib/impact, so they live here rather than in either one.
  'severity.extreme': 'extreme',
  'severity.severe': 'severe',
  'severity.moderate': 'moderate',
  'severity.minor': 'minor',
  'severity.none': '',

  // Threat scan panel
  'scan.scanning': 'Scanning live hazard feeds',
  'scan.sources': 'JMA quake/tsunami/typhoon · USGS · GDACS worldwide',
  'scan.unknownTitle': 'Threat status unknown',
  'scan.failed': 'Failed: {sources}',
  'scan.clearTitle': 'No active threat at your location',
  'scan.events': '{count} events',
  'scan.closest': 'Closest recent event',
  'scan.checked': 'Checked {sources}',
  'scan.unreachable': 'unreachable: {sources}',
  'scan.affectsYou': '{hazard} — affects you',
  'scan.evacuateNow': 'Evacuate now',
  'scan.stayInside': 'Stay inside — do not evacuate',
  'scan.monitorOnly': 'Monitor only',
  'scan.mmi': 'est. intensity MMI {value}'
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
  'sms.copied': 'メッセージをコピーしました — SMSアプリに貼り付けて送信',

  'splash.skip': 'タップでスキップ',
  'splash.skipLabel': 'イントロをスキップ',
  'brand.tagline': '人による承認を必須とするマルチエージェント防災コパイロット。',

  'focus.title': '別の場所を確認中',
  'focus.note': '現在地ではありません — 経路はこの場所からの表示です',
  'focus.back': '現在地に戻る',
  'marker.accessibilityUnknown': 'バリアフリー情報は未確認',
  'marker.navigate': '経路を表示',
  'search.placeholder': '別の場所を確認…',
  'search.placeholderNear': '{place}周辺の別の場所を確認…',
  'search.profile': 'プロフィールと設定',
  'category.all': 'すべて',
  'category.shelter': '避難場所',
  'category.water': '給水',
  'category.medical': '医療',
  'category.station': '駅',
  'ar.standby': '警報を発動するとARナビが利用できます',
  'ar.alertSuffix': '警報',

  'controls.layers': '地図レイヤー',
  'controls.recenter': '現在地に戻す',
  'controls.voice': '音声ガイド',
  'controls.camera': 'ARカメラ表示',
  'controls.sos': '緊急アドバイザリーを発動',
  'layer.streets': '標準地図',
  'layer.satellite': '航空写真',
  'layer.traffic': 'リアルタイム交通',
  'layer.hazard': '災害情報',

  'location.maps.title': '地図を利用できません',
  'location.maps.body': 'SafeRoute AI は近くの避難場所と経路を探すために Google マップを使用します。通信状況を確認するか、VITE_GOOGLE_MAPS_API_KEY を設定してください。',
  'location.pending.title': '現在地を取得中…',
  'location.pending.body': '近くの避難場所・給水・医療拠点を表示するため位置情報を取得しています。屋内ではネットワーク測位に切り替わるため数秒かかることがあります。',
  'location.denied.title': '位置情報がブロックされています',
  'location.denied.body': 'ブラウザが位置情報の要求を拒否しているため、タップしても何も起こりません。設定で再度許可する必要があります。アプリから再確認することはできません。',
  'location.denied.step1': 'iPhone の Safari：アドレスバー左の「ぁあ」アイコンをタップ →「Web サイトの設定」→「位置情報」→「確認」または「許可」。',
  'location.denied.step2': '見当たらない場合：「設定」→「Safari」（新しい iOS では「App」内）→「位置情報」→「確認」。',
  'location.denied.step3': 'ホーム画面に追加した場合：「設定」→「SafeRoute AI」→「位置情報」→「このAppの使用中のみ許可」。',
  'location.denied.step4': '「設定」→「プライバシーとセキュリティ」→「位置情報サービス」がオンかどうかも確認してください。',
  'location.insecure.title': '安全な接続が必要です',
  'location.insecure.body': 'ブラウザは HTTPS のページにのみ位置情報を渡します。このサイトの https:// のアドレスを開いてください。http では何度タップしても取得できません。',
  'location.timeout.title': '位置情報の取得に時間がかかっています',
  'location.timeout.body': '精度を下げて再試行しましたが、時間内に測位できませんでした。建物の奥・地下・電車内ではよくあることです。',
  'location.timeout.step1': '窓際に移動するか屋外に出て、もう一度お試しください。',
  'location.timeout.step2': 'Wi-Fi をオンにしてください。ネットワークに接続していなくても測位が速くなります。',
  'location.unavailable.title': '位置を特定できません',
  'location.unavailable.body': '現在、デバイスが位置を特定できないと報告しています。',
  'location.unavailable.step1': 'デバイスの位置情報サービスが有効か確認してください。',
  'location.unavailable.step2': '機内モードがオンの場合はオフにしてください。',
  'location.unsupported.title': 'この環境では利用できません',
  'location.unsupported.body': 'このブラウザは位置情報に対応していません。Safari または Chrome をお試しください。',
  'location.default.title': '位置情報を有効にする',
  'location.default.body': 'SafeRoute AI は実際の現在地を基準に動作します。今いる場所に災害が到達するか判定するため、位置情報へのアクセスを許可してください。',
  'location.retry': 'もう一度試す',
  'location.retryAllowed': '許可しました — もう一度試す',

  'alerts.title': '発生中の警報',
  'alerts.subtitle': '周辺の最新状況',
  'alerts.rescan': '再スキャン',
  'alerts.rescanning': 'スキャン中',
  'alerts.rescanTitle': '災害情報を再スキャン',
  'alerts.noScan': 'まだスキャンしていません。安全確認を実行すると周辺の事象が表示されます。',
  'alerts.scanningBody': '災害情報をスキャンしています…',
  'alerts.unavailable': 'どの災害情報にも接続できませんでした。これは「安全」を意味しません。接続を確認して再試行してください。',
  'alerts.none': '周辺で最近の事象は見つかりませんでした。',
  'alerts.actingOnThis': 'これに対応中',
  'alerts.away': '{distance}先',
  'alerts.distanceUnknown': '距離不明',
  'response.evacuate': '避難する',
  'response.shelter_in_place': '屋内にとどまる',
  'response.monitor': '注視する',

  'voice.active': '音声アシスタント・操作 有効',
  'voice.fallbackTitle': '経路の準備ができました',
  'voice.fallbackDesc': '表示された経路に従ってください。',
  'voice.analyzing': '状況を分析しています。避難指示をお待ちください。',
  'voice.standby': '待機中です。話しかけてプロフィールを変更するか、「地震」と言ってください。',
  'voice.listening': '聞き取り中…',
  'voice.tapToSpeak': 'タップして話す',
  'voice.heard': '認識：「{text}」',
  'voice.hint': '「車椅子」「3階」「地震」などと話してください…',
  'voice.ready': '音声操作の準備完了…',

  'advisory.awaitingFeed': '配信待ち',
  'advisory.original': '原文（JMA）',
  'advisory.fetching': '公式発表を取得しています…',

  'telemetry.title': 'ライブテレメトリ',
  'telemetry.viewingElsewhere': '別地点を表示中',
  'telemetry.gpsLocked': 'GPS 取得済み',
  'telemetry.awaitingGps': 'GPS 待機中',
  'telemetry.checking': '確認中の場所',
  'telemetry.youAreAt': '現在地',
  'telemetry.acquiring': '端末の位置を取得しています…',
  'telemetry.nearestShelter': '最寄りの避難場所',
  'telemetry.awaitingPlaces': 'Places データを取得中…',
  'telemetry.straightLine': '直線距離 {distance}',
  'telemetry.official': '✓ この災害に対して正式に指定された避難場所',
  'telemetry.unofficial': '⚠ この地域に公式の登録はありません — 近隣施設であり、指定避難場所ではありません',
  'telemetry.walkingRoute': '徒歩ルート',
  'telemetry.routeSummary': '{distance}・所要 {duration}',

  'guard.title': '家族の場所',
  'guard.noneAdded': 'まだ登録がありません',
  'guard.inAffected': '{count}件が影響範囲内',
  'guard.noneAffected': '影響範囲内はありません',

  'agents.title': 'マルチエージェント処理ログ',
  'agents.thinking': '推論中',
  'agents.ready': '完了',
  'agents.pending': '待機',

  'severity.extreme': '甚大',
  'severity.severe': '重大',
  'severity.moderate': '中程度',
  'severity.minor': '軽微',
  'severity.none': '',

  'scan.scanning': '災害情報をスキャン中',
  'scan.sources': 'JMA 地震・津波・台風 ・ USGS ・ GDACS（全世界）',
  'scan.unknownTitle': '危険度は判定できません',
  'scan.failed': '取得失敗：{sources}',
  'scan.clearTitle': '現在地に影響する災害はありません',
  'scan.events': '{count}件',
  'scan.closest': '最も近い最近の事象',
  'scan.checked': '確認済み：{sources}',
  'scan.unreachable': '接続不可：{sources}',
  'scan.affectsYou': '{hazard} — 現在地に影響します',
  'scan.evacuateNow': 'ただちに避難',
  'scan.stayInside': '屋内にとどまる — 避難しないでください',
  'scan.monitorOnly': '注視のみ',
  'scan.mmi': '推定震度 MMI {value}'
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
  'sms.copied': '消息已复制 — 请粘贴到短信应用发送',

  'splash.skip': '点击跳过',
  'splash.skipLabel': '跳过开场动画',
  'brand.tagline': '一款必须经过人工审批的多智能体防灾副驾驶。',

  'focus.title': '正在查看其他地点',
  'focus.note': '这不是您的位置 — 显示的路线从此处出发',
  'focus.back': '回到我的位置',
  'marker.accessibilityUnknown': '无障碍信息未经核实',
  'marker.navigate': '查看路线',
  'search.placeholder': '查看其他地点…',
  'search.placeholderNear': '查看{place}附近的其他地点…',
  'search.profile': '个人资料与设置',
  'category.all': '全部',
  'category.shelter': '避难所',
  'category.water': '供水',
  'category.medical': '医疗',
  'category.station': '车站',
  'ar.standby': '触发警报后即可使用 AR 导航',
  'ar.alertSuffix': '警报',

  'controls.layers': '地图图层',
  'controls.recenter': '回到当前位置',
  'controls.voice': '语音副驾驶引导',
  'controls.camera': 'AR 相机视图',
  'controls.sos': '触发紧急建议',
  'layer.streets': '矢量地图',
  'layer.satellite': '卫星图像',
  'layer.traffic': '实时路况',
  'layer.hazard': '灾害信息',

  'location.maps.title': '地图服务不可用',
  'location.maps.body': 'SafeRoute AI 需要 Google 地图服务来查找附近的避难所和路线。请检查网络连接，或配置 VITE_GOOGLE_MAPS_API_KEY。',
  'location.pending.title': '正在定位…',
  'location.pending.body': '正在获取您的位置，以显示附近的避难所、供水点和医疗点。在室内可能需要几秒钟，系统会改用网络定位。',
  'location.denied.title': '定位权限已被阻止',
  'location.denied.body': '浏览器正在拒绝定位请求，所以点击没有任何反应。必须在设置中重新允许 — 应用无法自行再次询问。',
  'location.denied.step1': 'iPhone 上的 Safari：点按地址栏左侧的页面设置图标 →「网站设置」→「位置」→「询问」或「允许」。',
  'location.denied.step2': '如果没有该选项：「设置」→「Safari 浏览器」（较新的 iOS 位于「应用」内）→「位置」→「询问」。',
  'location.denied.step3': '已添加到主屏幕？「设置」→「SafeRoute AI」→「位置」→「使用 App 期间」。',
  'location.denied.step4': '另请检查「设置」→「隐私与安全性」→「定位服务」是否已开启。',
  'location.insecure.title': '需要安全连接',
  'location.insecure.body': '浏览器只会向通过 HTTPS 提供的页面授予位置权限。请打开本站的 https:// 地址 — 在 http 下无论点击多少次都无法生效。',
  'location.timeout.title': '定位耗时过长',
  'location.timeout.body': '即使降低精度重试，您的设备仍未能及时完成定位。在建筑物深处、地下室和列车上这属于正常现象。',
  'location.timeout.step1': '请靠近窗户或走到室外，然后重试。',
  'location.timeout.step2': '请打开 Wi-Fi — 即使未连接任何网络，也能加快定位速度。',
  'location.unavailable.title': '无法获取位置',
  'location.unavailable.body': '设备报告目前无法确定位置。',
  'location.unavailable.step1': '请检查设备的定位服务是否已启用。',
  'location.unavailable.step2': '如果已开启飞行模式，请将其关闭。',
  'location.unsupported.title': '此环境不支持',
  'location.unsupported.body': '此浏览器完全不提供定位功能。请尝试 Safari 或 Chrome。',
  'location.default.title': '启用定位',
  'location.default.body': 'SafeRoute AI 基于您的真实位置运行。请允许访问位置信息，以便判断实时灾害是否会影响您所在的位置。',
  'location.retry': '重试',
  'location.retryAllowed': '我已允许 — 重试',

  'alerts.title': '实时警报',
  'alerts.subtitle': '您所在区域的实时动态',
  'alerts.rescan': '重新扫描',
  'alerts.rescanning': '扫描中',
  'alerts.rescanTitle': '重新扫描灾害信息源',
  'alerts.noScan': '尚未扫描。运行安全检查即可查看您附近的实时事件。',
  'alerts.scanningBody': '正在扫描实时灾害信息…',
  'alerts.unavailable': '无法连接任何灾害信息源，因此这并不代表安全。请在有网络后重试。',
  'alerts.none': '未在您附近发现近期事件。',
  'alerts.actingOnThis': '正在据此行动',
  'alerts.away': '距离 {distance}',
  'alerts.distanceUnknown': '距离未知',
  'response.evacuate': '撤离',
  'response.shelter_in_place': '就地避险',
  'response.monitor': '持续关注',

  'voice.active': '语音助手与语音控制已启用',
  'voice.fallbackTitle': '路线已就绪',
  'voice.fallbackDesc': '请沿高亮显示的路线前进。',
  'voice.analyzing': '正在分析情况，请等待疏散指示。',
  'voice.standby': '待命中。可以说话修改个人资料，或说「地震」。',
  'voice.listening': '正在聆听…',
  'voice.tapToSpeak': '点击说话',
  'voice.heard': '已识别：「{text}」',
  'voice.hint': '可以说「轮椅」「3楼」「地震」…',
  'voice.ready': '语音控制已就绪…',

  'advisory.awaitingFeed': '等待信息源',
  'advisory.original': '原文（JMA）',
  'advisory.fetching': '正在获取官方公告…',

  'telemetry.title': '实时遥测',
  'telemetry.viewingElsewhere': '正在查看其他位置',
  'telemetry.gpsLocked': 'GPS 已锁定',
  'telemetry.awaitingGps': '等待 GPS',
  'telemetry.checking': '正在查看',
  'telemetry.youAreAt': '您的位置',
  'telemetry.acquiring': '正在获取设备位置…',
  'telemetry.nearestShelter': '最近的避难所',
  'telemetry.awaitingPlaces': '正在获取 Places 数据…',
  'telemetry.straightLine': '直线距离 {distance}',
  'telemetry.official': '✓ 已针对此类灾害正式指定',
  'telemetry.unofficial': '⚠ 此地区没有官方避难所名录 — 这是附近场所，并非指定避难所',
  'telemetry.walkingRoute': '步行路线',
  'telemetry.routeSummary': '{distance}・预计 {duration}',

  'guard.title': '家人所在地点',
  'guard.noneAdded': '尚未添加任何人',
  'guard.inAffected': '{count} 处位于受影响区域',
  'guard.noneAffected': '没有位于受影响区域',

  'agents.title': '多智能体流程日志',
  'agents.thinking': '推理中',
  'agents.ready': '已完成',
  'agents.pending': '等待中',

  'severity.extreme': '极端',
  'severity.severe': '严重',
  'severity.moderate': '中等',
  'severity.minor': '轻微',
  'severity.none': '',

  'scan.scanning': '正在扫描实时灾害信息源',
  'scan.sources': 'JMA 地震/海啸/台风 · USGS · GDACS 全球',
  'scan.unknownTitle': '灾害状态未知',
  'scan.failed': '获取失败：{sources}',
  'scan.clearTitle': '您所在位置没有正在发生的威胁',
  'scan.events': '{count} 起事件',
  'scan.closest': '最近的近期事件',
  'scan.checked': '已查询：{sources}',
  'scan.unreachable': '无法连接：{sources}',
  'scan.affectsYou': '{hazard} — 会影响您',
  'scan.evacuateNow': '立即撤离',
  'scan.stayInside': '留在室内 — 请勿外出撤离',
  'scan.monitorOnly': '仅需关注',
  'scan.mmi': '预估烈度 MMI {value}'
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
  'sms.copied': 'Đã sao chép — dán vào ứng dụng SMS để gửi',

  'splash.skip': 'Chạm để bỏ qua',
  'splash.skipLabel': 'Bỏ qua phần giới thiệu',
  'brand.tagline': 'Trợ lý thảm họa đa tác nhân với cổng phê duyệt bắt buộc của con người.',

  'focus.title': 'Đang xem một nơi khác',
  'focus.note': 'Không phải vị trí của bạn — tuyến đường xuất phát từ đây',
  'focus.back': 'Về vị trí của tôi',
  'marker.accessibilityUnknown': 'Chưa xác minh khả năng tiếp cận',
  'marker.navigate': 'Xem tuyến đường',
  'search.placeholder': 'Xem một nơi khác…',
  'search.placeholderNear': 'Xem nơi khác gần {place}…',
  'search.profile': 'Hồ sơ và cài đặt',
  'category.all': 'Tất cả',
  'category.shelter': 'Nơi trú ẩn',
  'category.water': 'Nước',
  'category.medical': 'Y tế',
  'category.station': 'Nhà ga',
  'ar.standby': 'Kích hoạt cảnh báo để bật dẫn đường AR',
  'ar.alertSuffix': 'CẢNH BÁO',

  'controls.layers': 'Lớp bản đồ',
  'controls.recenter': 'Về vị trí hiện tại',
  'controls.voice': 'Hướng dẫn bằng giọng nói',
  'controls.camera': 'Chế độ camera AR',
  'controls.sos': 'Kích hoạt cảnh báo khẩn cấp',
  'layer.streets': 'Bản đồ vector',
  'layer.satellite': 'Vệ tinh',
  'layer.traffic': 'Giao thông trực tiếp',
  'layer.hazard': 'Dữ liệu thảm họa',

  'location.maps.title': 'Không dùng được bản đồ',
  'location.maps.body': 'SafeRoute AI cần dịch vụ Google Maps để tìm nơi trú ẩn và tuyến đường gần bạn. Hãy kiểm tra kết nối, hoặc cấu hình VITE_GOOGLE_MAPS_API_KEY.',
  'location.pending.title': 'Đang xác định vị trí…',
  'location.pending.body': 'Đang lấy vị trí của bạn để hiển thị nơi trú ẩn, điểm cấp nước và y tế gần đó. Trong nhà có thể mất vài giây vì thiết bị chuyển sang định vị qua mạng.',
  'location.denied.title': 'Quyền vị trí đang bị chặn',
  'location.denied.body': 'Trình duyệt đang từ chối yêu cầu vị trí, nên chạm vào cũng không có gì xảy ra. Bạn phải cho phép lại trong phần cài đặt — ứng dụng không thể tự hỏi lại.',
  'location.denied.step1': 'Safari trên iPhone: chạm biểu tượng cài đặt trang ở bên trái thanh địa chỉ → “Cài đặt trang web” → “Vị trí” → “Hỏi” hoặc “Cho phép”.',
  'location.denied.step2': 'Nếu không thấy tùy chọn đó: Cài đặt → Safari (nằm trong mục “Ứng dụng” trên iOS mới) → Vị trí → Hỏi.',
  'location.denied.step3': 'Đã thêm vào Màn hình chính? Cài đặt → SafeRoute AI → Vị trí → Khi đang dùng ứng dụng.',
  'location.denied.step4': 'Cũng hãy kiểm tra Cài đặt → Quyền riêng tư & Bảo mật → Dịch vụ định vị đã bật chưa.',
  'location.insecure.title': 'Cần kết nối an toàn',
  'location.insecure.body': 'Trình duyệt chỉ cấp quyền vị trí cho trang dùng HTTPS. Hãy mở địa chỉ https:// của trang này — với http thì dù chạm bao nhiêu lần cũng không được.',
  'location.timeout.title': 'Việc định vị mất quá nhiều thời gian',
  'location.timeout.body': 'Thiết bị của bạn không kịp xác định vị trí, kể cả khi đã thử lại với độ chính xác thấp hơn. Điều này là bình thường khi ở sâu trong tòa nhà, tầng hầm hay trên tàu.',
  'location.timeout.step1': 'Hãy đến gần cửa sổ hoặc ra ngoài trời, rồi thử lại.',
  'location.timeout.step2': 'Hãy bật Wi-Fi — nó giúp định vị nhanh hơn ngay cả khi bạn không kết nối mạng nào.',
  'location.unavailable.title': 'Không lấy được vị trí',
  'location.unavailable.body': 'Thiết bị báo rằng hiện không thể xác định vị trí.',
  'location.unavailable.step1': 'Hãy kiểm tra Dịch vụ định vị đã được bật trên thiết bị.',
  'location.unavailable.step2': 'Hãy tắt Chế độ máy bay nếu đang bật.',
  'location.unsupported.title': 'Không hỗ trợ tại đây',
  'location.unsupported.body': 'Trình duyệt này hoàn toàn không cung cấp vị trí. Hãy thử Safari hoặc Chrome.',
  'location.default.title': 'Bật vị trí',
  'location.default.body': 'SafeRoute AI hoạt động dựa trên vị trí thật của bạn. Hãy cho phép truy cập vị trí để ứng dụng đối chiếu các thảm họa đang diễn ra với nơi bạn thực sự đang ở.',
  'location.retry': 'Thử lại',
  'location.retryAllowed': 'Tôi đã cho phép — thử lại',

  'alerts.title': 'Cảnh báo trực tiếp',
  'alerts.subtitle': 'Cập nhật trực tiếp trong khu vực của bạn',
  'alerts.rescan': 'Quét lại',
  'alerts.rescanning': 'Đang quét',
  'alerts.rescanTitle': 'Quét lại các nguồn dữ liệu thảm họa',
  'alerts.noScan': 'Chưa quét lần nào. Hãy chạy kiểm tra an toàn để xem các sự kiện gần bạn.',
  'alerts.scanningBody': 'Đang quét các nguồn dữ liệu thảm họa…',
  'alerts.unavailable': 'Không kết nối được nguồn dữ liệu nào, nên đây không phải là thông báo an toàn. Hãy thử lại khi có kết nối.',
  'alerts.none': 'Không tìm thấy sự kiện nào gần đây quanh bạn.',
  'alerts.actingOnThis': 'Đang xử lý sự kiện này',
  'alerts.away': 'cách {distance}',
  'alerts.distanceUnknown': 'không rõ khoảng cách',
  'response.evacuate': 'Sơ tán',
  'response.shelter_in_place': 'Trú ẩn tại chỗ',
  'response.monitor': 'Theo dõi',

  'voice.active': 'Trợ lý và điều khiển bằng giọng nói đang bật',
  'voice.fallbackTitle': 'Tuyến đường đã sẵn sàng',
  'voice.fallbackDesc': 'Hãy đi theo tuyến đường được tô sáng.',
  'voice.analyzing': 'Đang phân tích tình huống. Vui lòng chờ hướng dẫn sơ tán.',
  'voice.standby': 'Đang chờ. Hãy nói để thay đổi hồ sơ, hoặc nói “kích hoạt”.',
  'voice.listening': 'Đang nghe…',
  'voice.tapToSpeak': 'Chạm để nói',
  'voice.heard': 'Đã nghe: “{text}”',
  'voice.hint': 'Hãy nói “xe lăn”, “tầng 3”, “kích hoạt”…',
  'voice.ready': 'Điều khiển giọng nói đã sẵn sàng…',

  'advisory.awaitingFeed': 'CHỜ DỮ LIỆU',
  'advisory.original': 'Nguyên văn (JMA)',
  'advisory.fetching': 'Đang tải bản tin chính thức…',

  'telemetry.title': 'Dữ liệu trực tiếp',
  'telemetry.viewingElsewhere': 'ĐANG XEM NƠI KHÁC',
  'telemetry.gpsLocked': 'ĐÃ CÓ GPS',
  'telemetry.awaitingGps': 'ĐANG CHỜ GPS',
  'telemetry.checking': 'Đang xem',
  'telemetry.youAreAt': 'Bạn đang ở',
  'telemetry.acquiring': 'Đang lấy vị trí thiết bị…',
  'telemetry.nearestShelter': 'Nơi trú ẩn gần nhất',
  'telemetry.awaitingPlaces': 'Đang chờ dữ liệu Places…',
  'telemetry.straightLine': 'cách {distance} · đường chim bay',
  'telemetry.official': '✓ được chỉ định chính thức cho loại thảm họa này',
  'telemetry.unofficial': '⚠ khu vực này không có danh mục chính thức — đây là địa điểm gần đó, không phải nơi trú ẩn',
  'telemetry.walkingRoute': 'Tuyến đi bộ',
  'telemetry.routeSummary': '{distance} · dự kiến {duration}',

  'guard.title': 'Địa điểm của gia đình',
  'guard.noneAdded': 'Chưa thêm ai',
  'guard.inAffected': '{count} nơi trong vùng ảnh hưởng',
  'guard.noneAffected': 'Không nơi nào trong vùng ảnh hưởng',

  'agents.title': 'Nhật ký quy trình đa tác nhân',
  'agents.thinking': 'Đang suy luận',
  'agents.ready': 'Xong',
  'agents.pending': 'Chờ',

  'severity.extreme': 'cực kỳ nghiêm trọng',
  'severity.severe': 'nghiêm trọng',
  'severity.moderate': 'trung bình',
  'severity.minor': 'nhẹ',
  'severity.none': '',

  'scan.scanning': 'Đang quét các nguồn dữ liệu thảm họa',
  'scan.sources': 'JMA động đất/sóng thần/bão · USGS · GDACS toàn cầu',
  'scan.unknownTitle': 'Không xác định được mức nguy hiểm',
  'scan.failed': 'Thất bại: {sources}',
  'scan.clearTitle': 'Không có mối nguy nào đang ảnh hưởng đến vị trí của bạn',
  'scan.events': '{count} sự kiện',
  'scan.closest': 'Sự kiện gần đây gần nhất',
  'scan.checked': 'Đã kiểm tra {sources}',
  'scan.unreachable': 'không kết nối được: {sources}',
  'scan.affectsYou': '{hazard} — ảnh hưởng đến bạn',
  'scan.evacuateNow': 'Sơ tán ngay',
  'scan.stayInside': 'Ở trong nhà — không sơ tán',
  'scan.monitorOnly': 'Chỉ theo dõi',
  'scan.mmi': 'cường độ ước tính MMI {value}'
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
