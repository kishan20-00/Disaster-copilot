// Localized UI labels keyed by app language.
export type Labels = {
  welcome: string;
  trigger: string;
  approving: string;
  instructions: string;
  familyMsg: string;
  copied: string;
  analyzing: string;
};

export const LANGUAGES_MAP = {
  English: {
    welcome: "Peace of Mind",
    trigger: "Scan For Live Threats",
    approving: "Human-in-the-Loop Gate",
    instructions: "DO THIS NOW",
    familyMsg: "Draft Emergency Message",
    copied: "Message copied — paste into your SMS app",
    analyzing: "Co-pilot reasoning in progress..."
  },
  Chinese: {
    welcome: "安心保驾",
    trigger: "扫描实时灾害警报",
    approving: "人工审批网关",
    instructions: "立即执行以下操作",
    familyMsg: "紧急求助短信草稿",
    copied: "消息已复制 — 请粘贴到短信应用发送",
    analyzing: "副驾驶智能推理中..."
  },
  Vietnamese: {
    welcome: "An Tâm Tuyệt Đối",
    trigger: "Quét Cảnh Báo Thảm Họa",
    approving: "Cổng Phê Duyệt Nhân Sự",
    instructions: "HÀNH ĐỘNG NGAY",
    familyMsg: "Bản Nháp Tin Nhắn Khẩn Cấp",
    copied: "Đã sao chép — dán vào ứng dụng SMS để gửi",
    analyzing: "Trợ lý ảo đang phân tích tình huống..."
  },
  Japanese: {
    welcome: "安心・安全",
    trigger: "最新の災害情報をスキャン",
    approving: "ヒューマン・ゲートウェイ",
    instructions: "今すぐ実行すべき行動",
    familyMsg: "緊急連絡メッセージ案",
    copied: "メッセージをコピーしました — SMSアプリに貼り付けて送信",
    analyzing: "コパイロットが推論しています..."
  }
};
