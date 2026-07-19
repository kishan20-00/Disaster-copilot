// Localized UI labels keyed by app language.
export type Labels = {
  welcome: string;
  trigger: string;
  approving: string;
  instructions: string;
  familyMsg: string;
  sent: string;
  analyzing: string;
};

export const LANGUAGES_MAP = {
  English: {
    welcome: "Peace of Mind",
    trigger: "Trigger Alert Replay",
    approving: "Human-in-the-Loop Gate",
    instructions: "DO THIS NOW",
    familyMsg: "Draft Emergency Message",
    sent: "Emergency SMS Dispatched!",
    analyzing: "Co-pilot reasoning in progress..."
  },
  Chinese: {
    welcome: "安心保驾",
    trigger: "触发警报回放",
    approving: "人工审批网关",
    instructions: "立即执行以下操作",
    familyMsg: "紧急求助短信草稿",
    sent: "紧急求助短信已发送！",
    analyzing: "副驾驶智能推理中..."
  },
  Vietnamese: {
    welcome: "An Tâm Tuyệt Đối",
    trigger: "Kích Hoạt Kịch Bản",
    approving: "Cổng Phê Duyệt Nhân Sự",
    instructions: "HÀNH ĐỘNG NGAY",
    familyMsg: "Bản Nháp Tin Nhắn Khẩn Cấp",
    sent: "Tin nhắn khẩn cấp đã được gửi!",
    analyzing: "Trợ lý ảo đang phân tích tình huống..."
  },
  Japanese: {
    welcome: "安心・安全",
    trigger: "デモアラート起動",
    approving: "ヒューマン・ゲートウェイ",
    instructions: "今すぐ実行すべき行動",
    familyMsg: "緊急連絡メッセージ案",
    sent: "緊急メッセージを送信しました！",
    analyzing: "コパイロットが推論しています..."
  }
};
