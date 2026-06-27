import { useState, useEffect } from 'react';
import {
  Shield,
  Activity,
  Users,
  Send,
  Check,
  X,
  AlertTriangle,
  Play,
  RotateCcw,
  Smartphone,
  Settings,
  Compass,
  CheckCircle2,
  MessageSquare,
  MapPin,
  CloudLightning,
  Waves,
  ArrowRight
} from 'lucide-react';

// Define TS interfaces for our state
interface AgentState {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'running' | 'completed';
  result: string;
}

interface PersonalContext {
  language: 'English' | 'Chinese' | 'Vietnamese' | 'Japanese';
  location: 'Shibuya' | 'Minato' | 'Shinjuku';
  floor: '9th Floor' | 'Ground Floor' | 'Basement';
  companions: 'Traveling Solo' | 'With a Child' | 'With Elderly Parents';
  mobility: 'Fully Mobile' | 'Wheelchair User';
}

const LANGUAGES_MAP = {
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

export default function App() {
  // Demo configurations
  const [activeHazard, setActiveHazard] = useState<'earthquake' | 'typhoon' | 'tsunami'>('earthquake');
  const [personalContext, setPersonalContext] = useState<PersonalContext>({
    language: 'English',
    location: 'Shibuya',
    floor: '9th Floor',
    companions: 'With a Child',
    mobility: 'Fully Mobile'
  });

  // Simulation play state
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsStatus, setSmsStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  // Agent Pipeline States
  const [agents, setAgents] = useState<AgentState[]>([
    { id: 'situation', name: 'Situation Agent', role: 'Hazard Analysis', status: 'idle', result: '' },
    { id: 'personal', name: 'Personal Context Agent', role: 'Vulnerability Analysis', status: 'idle', result: '' },
    { id: 'route', name: 'Route & Shelter Agent', role: 'Evacuation Mapping', status: 'idle', result: '' },
    { id: 'translate', name: 'Translate & Comms Agent', role: 'Language Synthesis', status: 'idle', result: '' },
    { id: 'commander', name: 'Commander Agent', role: 'Synthesis & Command', status: 'idle', result: '' }
  ]);

  // Translate labels dynamically based on selected language
  const labels = LANGUAGES_MAP[personalContext.language];

  // Dynamic advice synthesis based on context
  const getDynamicAdvice = () => {
    const { language, floor, companions, mobility } = personalContext;
    
    if (activeHazard === 'earthquake') {
      const steps = [];
      // Step 1: Drop Cover Hold or evac
      if (floor === '9th Floor') {
        steps.push({
          num: "1",
          title: language === 'English' ? "Drop, Cover, Hold" : language === 'Chinese' ? "伏地、遮挡、手扶" : language === 'Vietnamese' ? "Nằm xuống, Che chắn, Giữ chặt" : "伏せ、頭を守り、動かない",
          desc: language === 'English' ? "High rise shaking. Stay away from glass window walls." : language === 'Chinese' ? "高楼层摇晃剧烈。请远离玻璃幕墙。" : language === 'Vietnamese' ? "Tòa nhà cao tầng rung lắc. Tránh xa các vách kính." : "高層ビル特有の揺れ。窓ガラスから離れてください。"
        });
      } else if (floor === 'Ground Floor') {
        steps.push({
          num: "1",
          title: language === 'English' ? "Evacuate Outwards" : language === 'Chinese' ? "立即疏散到室外" : language === 'Vietnamese' ? "Sơ tán ra bên ngoài" : "屋外へ避難してください",
          desc: language === 'English' ? "Ground floor risks. Evacuate immediately if safety exits are clear." : language === 'Chinese' ? "低楼层风险。安全通道畅通时请立即撤离。" : language === 'Vietnamese' ? "Nguy cơ sập đổ. Sơ tán ngay lập tức nếu lối thoát hiểm an toàn." : "低階のリスク。安全出口が確保されている場合は即座に避難。"
        });
      } else {
        steps.push({
          num: "1",
          title: language === 'English' ? "Protect Head & Move Up" : language === 'Chinese' ? "护住头部并往上撤" : language === 'Vietnamese' ? "Bảo vệ đầu & di chuyển lên" : "頭を保護し、地上へ避難",
          desc: language === 'English' ? "Basement trap risk. Move to ground level once heavy shaking stops." : language === 'Chinese' ? "地下陷阱风险。剧烈摇晃停止后请立即前往地面。" : language === 'Vietnamese' ? "Nguy cơ mắc kẹt dưới hầm. Di chuyển lên mặt đất khi hết rung lắc." : "地下での閉じ込めリスク。揺れが収まり次第、地上へ移動。"
        });
      }

      // Step 2: Elevators
      steps.push({
        num: "2",
        title: language === 'English' ? "Take Stairs, NOT Elevator" : language === 'Chinese' ? "走安全通道，禁用电梯" : language === 'Vietnamese' ? "Đi cầu thang bộ, KHÔNG dùng thang máy" : "階段を使用（エレベーター禁止）",
        desc: companions === 'With a Child' 
          ? (language === 'English' ? "Secure stroller, carry child. Walk calmly down." : language === 'Chinese' ? "抱住孩子，收起婴儿车。有序下楼。" : language === 'Vietnamese' ? "Gấp xe đẩy, bế trẻ em. Đi bộ bình tĩnh." : "ベビーカーは畳み、子供を抱きかかえて歩いてください。")
          : companions === 'With Elderly Parents'
          ? (language === 'English' ? "Support companion. Avoid rushing, pace yourselves." : language === 'Chinese' ? "扶助长辈。避免拥挤，稳步前行。" : language === 'Vietnamese' ? "Hỗ trợ cha mẹ lớn tuổi. Tránh chen lấn, đi vững chắc." : "高齢の家族をサポートしてください。焦らず、一歩ずつ下りてください。")
          : (language === 'English' ? "Keep hands free. Walk, do not run." : language === 'Chinese' ? "双手保持空闲。小步快走，切勿奔跑。" : language === 'Vietnamese' ? "Giữ hai tay tự do. Đi bộ, không chạy." : "両手を空けてください。走らず歩いてください。")
      });

      // Step 3: Route
      const shelter = personalContext.location === 'Shibuya' ? 'Miyashita Park (400m)' : personalContext.location === 'Minato' ? 'Shiba Park (650m)' : 'Shinjuku Gyoen (800m)';
      steps.push({
        num: "3",
        title: language === 'English' ? `Evacuate to ${shelter}` : language === 'Chinese' ? `前往 ${shelter} 避难` : language === 'Vietnamese' ? `Sơ tán đến ${shelter}` : `${shelter} へ避難`,
        desc: mobility === 'Wheelchair User'
          ? (language === 'English' ? "Route is pre-vetted with ADA flat access ramps." : language === 'Chinese' ? "该路线已预先规划无障碍轮椅坡道。" : language === 'Vietnamese' ? "Tuyến đường đã được xác thực hỗ trợ xe lăn vô ngại." : "車椅子対応のバリアフリー経路が確保されています。")
          : (language === 'English' ? "Direct, hazard-free sidewalk path mapped below." : language === 'Chinese' ? "下方已为您绘制了无危险建筑物的避难路径。" : language === 'Vietnamese' ? "Bản đồ hiển thị tuyến đường đi bộ an toàn, không vật cản." : "落下物の危険が少ないルートが以下にマッピングされています。")
      });

      return steps;
    } else if (activeHazard === 'typhoon') {
      return [
        {
          num: "1",
          title: language === 'English' ? "Shelter Indoors" : language === 'Chinese' ? "室内避难" : language === 'Vietnamese' ? "Trú ẩn trong nhà" : "室内避難",
          desc: language === 'English' ? "Extreme category 4 winds. Lock all glass windows and storms shields." : language === 'Chinese' ? "超强4级台风。锁紧所有窗户并拉上防风网。" : language === 'Vietnamese' ? "Gió bão giật cấp 4 cực mạnh. Khóa chặt tất cả cửa kính." : "非常に強い台風。すべての窓と防風シャッターを閉めてください。"
        },
        {
          num: "2",
          title: language === 'English' ? "Move Away From Windows" : language === 'Chinese' ? "远离外窗" : language === 'Vietnamese' ? "Tránh xa cửa sổ" : "窓から離れる",
          desc: floor === 'Basement' 
            ? (language === 'English' ? "Basement flooding threat! Move to upper floors immediately." : language === 'Chinese' ? "地下室积水威胁！请立即转移至高层楼层。" : language === 'Vietnamese' ? "Nguy cơ ngập lụt tầng hầm! Di chuyển ngay lên tầng trên." : "地下浸水のリスク！直ちに上の階に避難してください。")
            : (language === 'English' ? "Debris impact hazard. Stay in inner-rooms or hallways." : language === 'Chinese' ? "碎物撞击危险。请待在无窗的内室或走廊。" : language === 'Vietnamese' ? "Mảnh vỡ có thể văng vào. Trú ẩn trong phòng kín hoặc lối đi giữa nhà." : "飛来物の危険。窓のない内室か廊下で待機してください。")
        },
        {
          num: "3",
          title: language === 'English' ? "Monitor Local Inundation" : language === 'Chinese' ? "监控积水深度" : language === 'Vietnamese' ? "Theo dõi mực nước ngập" : "浸水情報のモニタリング",
          desc: language === 'English' ? "Checking high-ground evacuation path if sea surges occur." : language === 'Chinese' ? "如发生风暴潮，系统将规划高地避难路径。" : language === 'Vietnamese' ? "Sẵn sàng lộ trình sơ tán lên vùng cao nếu có triều cường dâng." : "高潮発生に備え、高台への避難経路を準備しています。"
        }
      ];
    } else {
      // Tsunami
      return [
        {
          num: "1",
          title: language === 'English' ? "Seek Immediate High Ground" : language === 'Chinese' ? "立即寻找高处避难" : language === 'Vietnamese' ? "Tìm nơi cao ráo ngay" : "直ちに高台避難",
          desc: language === 'English' ? "Tsunami wave alert height 3m+. You must climb immediately." : language === 'Chinese' ? "海啸波高预警3米以上。请立刻向高处攀爬。" : language === 'Vietnamese' ? "Cảnh báo sóng thần cao trên 3m. Di chuyển lên cao ngay lập tức." : "大津波警報（予想高3m超）。今すぐ高台へ避難してください。"
        },
        {
          num: "2",
          title: language === 'English' ? "Vertical Evacuation" : language === 'Chinese' ? "垂直避难" : language === 'Vietnamese' ? "Sơ tán khẩn cấp theo chiều dọc" : "垂直避難の実行",
          desc: floor === '9th Floor'
            ? (language === 'English' ? "Stay on current 9th floor. You are well above wave crest height." : language === 'Chinese' ? "留在当前9楼。您的高度已远超预计浪高。" : language === 'Vietnamese' ? "Hãy ở lại tầng 9 hiện tại. Bạn đang ở độ cao an toàn trước sóng thần." : "現在の9階に留まってください。波高を大幅に上回っています。")
            : (language === 'English' ? "Ground floor vulnerable. Climb to 4th floor or higher in nearest strong structure." : language === 'Chinese' ? "低楼层极其危险。请立即爬到附近坚固建筑的4层或以上。" : language === 'Vietnamese' ? "Tầng trệt vô cùng nguy hiểm. Di chuyển lên tầng 4 hoặc cao hơn của tòa nhà kiên cố." : "低階は極めて危険。頑丈なビルの4階以上に上ってください。")
        },
        {
          num: "3",
          title: language === 'English' ? "Do NOT Drive or Use Elevators" : language === 'Chinese' ? "切勿驾车或乘电梯" : language === 'Vietnamese' ? "KHÔNG tự lái xe hay dùng thang máy" : "運転およびエレベーター禁止",
          desc: language === 'English' ? "Road gridlock and power outages imminent. Evacuate on foot." : language === 'Chinese' ? "交通瘫痪及停电迫在眉睫。请徒步避难。" : language === 'Vietnamese' ? "Giao thông dễ tắc nghẽn & mất điện diện rộng. Đi bộ thoát hiểm." : "渋滞と停電の恐れ。徒歩での避難を徹底してください。"
        }
      ];
    }
  };

  // Run the multi-agent pipeline simulation
  useEffect(() => {
    if (!isSimulating) return;

    if (currentStep === 0) {
      // Step 0: Situation Agent starts
      setAgents(prev => prev.map((a, i) => i === 0 ? { ...a, status: 'running' } : a));
      const t = setTimeout(() => {
        setAgents(prev => prev.map((a, i) => i === 0 ? { 
          ...a, 
          status: 'completed', 
          result: activeHazard === 'earthquake' 
            ? "M7.2 Earthquake detected. Shibuya intensity JMA 5-Upper. Tsunami threat: ADVISORY (0.5m waves expected)." 
            : activeHazard === 'typhoon'
            ? "Category 4 Typhoon (Whip) making landfall in Kanto. Sustained winds 140km/h. Heavy rain 50mm/hr."
            : "M8.4 Subduction Quake. Shibuya intensity JMA 6-Lower. Major Tsunami Warning (Waves 3.2m in 8 mins)."
        } : a));
        setCurrentStep(1);
      }, 2500);
      return () => clearTimeout(t);
    }

    if (currentStep === 1) {
      // Step 1: Personal Context Agent runs
      setAgents(prev => prev.map((a, i) => i === 1 ? { ...a, status: 'running' } : a));
      const t = setTimeout(() => {
        setAgents(prev => prev.map((a, i) => i === 1 ? { 
          ...a, 
          status: 'completed', 
          result: `User context parsed: Lang: ${personalContext.language}, Location: ${personalContext.location}, Floor: ${personalContext.floor}, Companions: ${personalContext.companions}, Mobility: ${personalContext.mobility}. Vulnerability rating: HIGH.`
        } : a));
        setCurrentStep(2);
      }, 2000);
      return () => clearTimeout(t);
    }

    if (currentStep === 2) {
      // Step 2: Route & Shelter Agent runs
      setAgents(prev => prev.map((a, i) => i === 2 ? { ...a, status: 'running' } : a));
      const t = setTimeout(() => {
        const shelter = personalContext.location === 'Shibuya' ? 'Miyashita Park (Open, elevated shelter, 400m, ADA compliant path available)' : personalContext.location === 'Minato' ? 'Shiba Park (Open, 650m)' : 'Shinjuku Gyoen (Open, 800m)';
        setAgents(prev => prev.map((a, i) => i === 2 ? { 
          ...a, 
          status: 'completed', 
          result: `Closest safe shelter: ${shelter}. Route safe of unreinforced masonry structures. ADA ramps verified.`
        } : a));
        setCurrentStep(3);
      }, 2000);
      return () => clearTimeout(t);
    }

    if (currentStep === 3) {
      // Step 3: Translate & Comms Agent runs
      setAgents(prev => prev.map((a, i) => i === 3 ? { ...a, status: 'running' } : a));
      const t = setTimeout(() => {
        setAgents(prev => prev.map((a, i) => i === 3 ? { 
          ...a, 
          status: 'completed', 
          result: `Draft text generated in ${personalContext.language}. Emergency contact parsed. Human validation required.`
        } : a));
        setCurrentStep(4);
      }, 2000);
      return () => clearTimeout(t);
    }

    if (currentStep === 4) {
      // Step 4: Commander Agent synthesizes final command cards
      setAgents(prev => prev.map((a, i) => i === 4 ? { ...a, status: 'running' } : a));
      const t = setTimeout(() => {
        setAgents(prev => prev.map((a, i) => i === 4 ? { 
          ...a, 
          status: 'completed', 
          result: `Command list compiled with 3 hyper-personalized steps in ${personalContext.language}. Layout dispatched.`
        } : a));
        setIsSimulating(false);
        setShowSmsModal(true); // Pop open the approval gate at the very end
      }, 2000);
      return () => clearTimeout(t);
    }

  }, [isSimulating, currentStep, activeHazard, personalContext]);

  // Restart simulation
  const handleTriggerAlert = () => {
    // Reset agent statuses
    setAgents(prev => prev.map(a => ({ ...a, status: 'idle', result: '' })));
    setSmsStatus('idle');
    setShowSmsModal(false);
    setIsSimulating(true);
    setCurrentStep(0);
  };

  const handleApproveSms = () => {
    setSmsStatus('sending');
    setTimeout(() => {
      setSmsStatus('sent');
      setTimeout(() => {
        setShowSmsModal(false);
      }, 2000);
    }, 1500);
  };

  // Get the drafted message text
  const getDraftedSmsText = () => {
    const lang = personalContext.language;
    if (activeHazard === 'earthquake') {
      if (lang === 'English') return `Alert: Strong quake in Shibuya. We're safe (floor ${personalContext.floor.replace(' Floor', '')}, with child). Heading to Miyashita Park. Tracker: https://mamori.ai/t/shib`;
      if (lang === 'Chinese') return `警告：涉谷发生强震。我们安全（位于${personalContext.floor}，带孩子）。正撤往宫下公园。追踪链接: https://mamori.ai/t/shib`;
      if (lang === 'Vietnamese') return `Cảnh báo: Động đất mạnh ở Shibuya. Chúng tôi ổn (tầng ${personalContext.floor.replace(' Floor', '')}, đi cùng con nhỏ). Đang tới Công viên Miyashita. Bản đồ: https://mamori.ai/t/shib`;
      return `【緊急連絡】渋谷で強い地震。無事です（${personalContext.floor}階・子供同伴）。宮下公園へ移動します。現在地：https://mamori.ai/t/shib`;
    } else if (activeHazard === 'typhoon') {
      if (lang === 'English') return `Alert: Category 4 Typhoon in Tokyo. Staying inside on floor ${personalContext.floor.replace(' Floor', '')}. Secured. Track: https://mamori.ai/t/shib`;
      if (lang === 'Chinese') return `警告：台风4级登陆东京。我们在${personalContext.floor}室内避险。一切安好。追踪: https://mamori.ai/t/shib`;
      if (lang === 'Vietnamese') return `Cảnh báo: Bão Cấp 4 ở Tokyo. Đang trú ẩn ở tầng ${personalContext.floor.replace(' Floor', '')}. An toàn. Định vị: https://mamori.ai/t/shib`;
      return `【緊急連絡】大型台風接近中。安全に${personalContext.floor}階に留まっています。無事です。GPS：https://mamori.ai/t/shib`;
    } else {
      if (lang === 'English') return `Alert: Major Tsunami Warning! Evacuating to safe vertical height. Position: Shibuya. Track: https://mamori.ai/t/shib`;
      if (lang === 'Chinese') return `紧急警报：大海啸预警！我们正前往高处垂直避难。涩谷。追踪: https://mamori.ai/t/shib`;
      if (lang === 'Vietnamese') return `Cảnh báo khẩn: Sóng thần lớn! Đang sơ tán lên vùng cao an toàn. Shibuya. Định vị: https://mamori.ai/t/shib`;
      return `【大津波警報】津波から避難するため、高台へ向かっています。現在地：渋谷。URL: https://mamori.ai/t/shib`;
    }
  };

  return (
    <div className="min-h-screen mobile-device-wrapper flex flex-col items-center justify-center p-0 sm:p-6 select-none">
      {/* Brand Header (Desktop Only) */}
      <div className="hidden sm:flex flex-col items-center mb-6 text-center">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-8 h-8 text-indigo-400 animate-pulse" />
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">
            Mamori AI <span className="text-indigo-400 text-lg font-medium font-sans">安心守り</span>
          </h1>
        </div>
        <p className="text-slate-400 text-sm max-w-sm">
          A premium multi-agent disaster co-pilot with a strict human-approval safety gate.
        </p>
      </div>

      {/* iPhone Device Shell Mockup */}
      <div className="mobile-device-frame bg-slate-950 w-full h-screen sm:h-[844px] sm:w-[390px] flex flex-col justify-between shadow-2xl relative text-white">
        
        {/* iOS Dynamic Island Area */}
        <div className="absolute top-0 inset-x-0 h-10 flex items-center justify-center z-50 pointer-events-none">
          <div className="w-28 h-6 bg-black rounded-full flex items-center justify-between px-3.5">
            <span className="text-[10px] text-emerald-400 font-bold tracking-tight">12:30</span>
            <div className="flex gap-1.5 items-center">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></span>
              <span className="text-[9px] text-slate-400 font-medium font-sans">5G</span>
            </div>
          </div>
        </div>

        {/* Device Content Area */}
        <div className="flex-1 flex flex-col pt-10 overflow-y-auto px-4 pb-24 scrollbar-thin">
          
          {/* Disaster Copilot Context Selector */}
          <div className="mb-4 backdrop-blur-md bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 mt-2">
            <div className="flex justify-between items-center mb-3 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Settings className="w-4 h-4 text-slate-400" />
                <span className="text-[11px] font-semibold tracking-wider uppercase font-sans">Demo Configurations</span>
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => !isSimulating && setActiveHazard('earthquake')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 ${activeHazard === 'earthquake' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800/40 text-slate-500 border border-transparent'}`}
                >
                  <Activity className="w-2.5 h-2.5" /> Quake
                </button>
                <button 
                  onClick={() => !isSimulating && setActiveHazard('typhoon')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 ${activeHazard === 'typhoon' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-slate-800/40 text-slate-500 border border-transparent'}`}
                >
                  <CloudLightning className="w-2.5 h-2.5" /> Typhoon
                </button>
                <button 
                  onClick={() => !isSimulating && setActiveHazard('tsunami')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 ${activeHazard === 'tsunami' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800/40 text-slate-500 border border-transparent'}`}
                >
                  <Waves className="w-2.5 h-2.5" /> Tsunami
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <label className="text-slate-400 block mb-0.5">Language</label>
                <select 
                  value={personalContext.language}
                  disabled={isSimulating}
                  onChange={(e) => setPersonalContext({...personalContext, language: e.target.value as PersonalContext['language']})}
                  className="w-full bg-slate-950/80 border border-slate-800 text-slate-200 px-2 py-1 rounded-lg focus:outline-none focus:border-indigo-500/50"
                >
                  <option value="English">🇬🇧 English</option>
                  <option value="Chinese">🇨🇳 简体中文</option>
                  <option value="Vietnamese">🇻🇳 Tiếng Việt</option>
                  <option value="Japanese">🇯🇵 日本語</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-0.5">Location</label>
                <select 
                  value={personalContext.location}
                  disabled={isSimulating}
                  onChange={(e) => setPersonalContext({...personalContext, location: e.target.value as PersonalContext['location']})}
                  className="w-full bg-slate-950/80 border border-slate-800 text-slate-200 px-2 py-1 rounded-lg focus:outline-none"
                >
                  <option value="Shibuya">Shibuya (渋谷)</option>
                  <option value="Minato">Minato (港区)</option>
                  <option value="Shinjuku">Shinjuku (新宿)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-0.5">Floor Level</label>
                <select 
                  value={personalContext.floor}
                  disabled={isSimulating}
                  onChange={(e) => setPersonalContext({...personalContext, floor: e.target.value as PersonalContext['floor']})}
                  className="w-full bg-slate-950/80 border border-slate-800 text-slate-200 px-2 py-1 rounded-lg focus:outline-none"
                >
                  <option value="9th Floor">9th Floor (High)</option>
                  <option value="Ground Floor">Ground Floor (Low)</option>
                  <option value="Basement">Basement</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-0.5">Companions</label>
                <select 
                  value={personalContext.companions}
                  disabled={isSimulating}
                  onChange={(e) => setPersonalContext({...personalContext, companions: e.target.value as PersonalContext['companions']})}
                  className="w-full bg-slate-950/80 border border-slate-800 text-slate-200 px-2 py-1 rounded-lg focus:outline-none"
                >
                  <option value="Traveling Solo">Traveling Solo</option>
                  <option value="With a Child">With a Child</option>
                  <option value="With Elderly Parents">With Elderly Parents</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="text-slate-400 block mb-0.5">Mobility Needs</label>
                <select 
                  value={personalContext.mobility}
                  disabled={isSimulating}
                  onChange={(e) => setPersonalContext({...personalContext, mobility: e.target.value as PersonalContext['mobility']})}
                  className="w-full bg-slate-950/80 border border-slate-800 text-slate-200 px-2 py-1 rounded-lg focus:outline-none"
                >
                  <option value="Fully Mobile">Fully Mobile</option>
                  <option value="Wheelchair User">Requires Wheelchair Access</option>
                </select>
              </div>
            </div>
          </div>

          {/* Simulated Hazard Early Warning Card */}
          {currentStep >= 0 ? (
            <div className={`mb-4 animate-in fade-in slide-in-from-top duration-300 border rounded-2xl overflow-hidden shadow-lg ${
              activeHazard === 'earthquake' ? 'bg-red-950/30 border-red-500/40 text-red-200' :
              activeHazard === 'typhoon' ? 'bg-sky-950/30 border-sky-500/40 text-sky-200' :
              'bg-amber-950/30 border-amber-500/40 text-amber-200'
            }`}>
              <div className={`px-3 py-2 flex items-center justify-between text-xs font-bold border-b ${
                activeHazard === 'earthquake' ? 'bg-red-950/60 border-red-500/20' :
                activeHazard === 'typhoon' ? 'bg-sky-950/60 border-sky-500/20' :
                'bg-amber-950/60 border-amber-500/20'
              }`}>
                <span className="flex items-center gap-1.5 uppercase font-sans">
                  <AlertTriangle className="w-3.5 h-3.5 animate-bounce" />
                  {activeHazard === 'earthquake' ? 'JMA Earthquake Warning' : activeHazard === 'typhoon' ? 'Typhoon Inflow Advisory' : 'Tsunami High Alert'}
                </span>
                <span className="text-[10px] font-mono">LIVE FEED</span>
              </div>
              <div className="p-3 text-xs flex gap-2">
                <div className="flex-1 font-mono leading-relaxed select-text">
                  {activeHazard === 'earthquake' && (
                    <>
                      <span className="font-semibold block mb-1">気象庁 地震緊急警報 (JMA)</span>
                      千葉県東方沖でマグニチュード7.2の強い地震発生。東京都渋谷区で強い揺れ（震度5強以上）に警戒してください。
                    </>
                  )}
                  {activeHazard === 'typhoon' && (
                    <>
                      <span className="font-semibold block mb-1">特別台風警報 (JMA)</span>
                      非常に強い台風が関東地方に接近。渋谷区周辺で最大風速140km/hに達する見込み。不要不急の外出を控えてください。
                    </>
                  )}
                  {activeHazard === 'tsunami' && (
                    <>
                      <span className="font-semibold block mb-1">大津波警報発表 (JMA)</span>
                      渋谷区沿岸低地等に危険到達。津波予想高3.2m。直ちに高台や避難ビルなどの安全な場所へ避難を開始してください。
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Standby State Screen */
            <div className="flex-1 flex flex-col justify-center items-center py-8 text-center">
              <div className="w-20 h-28 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center mb-4 shadow-inner">
                <Smartphone className="w-10 h-10 text-indigo-400 animate-pulse" />
              </div>
              <h2 className="text-lg font-bold mb-1 text-slate-100 font-sans">System Armed & Ready</h2>
              <p className="text-slate-400 text-xs px-6 leading-relaxed max-w-[280px]">
                Configured with local Tokyo open shelter feeds, GSI maps, and Gemini 3.5. Click below to simulate a disaster alert.
              </p>
              <div className="mt-6 flex flex-col items-center gap-2">
                <button 
                  onClick={handleTriggerAlert}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 px-6 rounded-full shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {labels.trigger}
                </button>
                <span className="text-[10px] text-slate-500 font-mono">DEMO PLAYBACK ENGINE v1.0</span>
              </div>
            </div>
          )}

          {/* Active Copilot Synthesis Panel */}
          {currentStep >= 4 && (
            <div className="mb-4 animate-in fade-in zoom-in-95 duration-500 border border-slate-800 bg-slate-900/40 rounded-2xl overflow-hidden p-4 shadow-xl">
              <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                <span className="text-xs font-extrabold tracking-wider uppercase font-sans text-indigo-300">
                  {labels.instructions}
                </span>
              </div>

              {/* Step Commands */}
              <div className="space-y-3">
                {getDynamicAdvice().map((step) => (
                  <div key={step.num} className="flex gap-3 items-start p-2 bg-slate-950/50 rounded-xl border border-slate-900">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-xs font-extrabold text-indigo-400 font-mono shrink-0">
                      {step.num}
                    </div>
                    <div className="flex-1 text-xs">
                      <h3 className="font-bold text-slate-100 font-sans">{step.title}</h3>
                      <p className="text-slate-400 mt-0.5 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Trigger Approval Gate Manual Button */}
              <div className="mt-4 pt-3 border-t border-slate-850 flex justify-between items-center text-xs">
                <span className="text-[10px] text-indigo-400/80 font-mono flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Auto-coordinated
                </span>
                <button 
                  onClick={() => setShowSmsModal(true)}
                  className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline flex items-center gap-1 transition"
                >
                  {labels.approving} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Multi-Agent Orchestration Logs */}
          {currentStep >= 0 && (
            <div className="mb-4 bg-slate-900/30 border border-slate-900 rounded-2xl p-3.5">
              <h3 className="text-[11px] font-bold tracking-wider uppercase text-slate-400 flex items-center gap-2 mb-2">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                Multi-Agent Pipeline
              </h3>
              <div className="space-y-2">
                {agents.map((agent, i) => {
                  const isActive = currentStep === i;
                  return (
                    <div key={agent.id} className={`text-[11px] rounded-xl p-2 transition ${isActive ? 'bg-indigo-950/25 border border-indigo-500/20' : 'bg-slate-950/30 border border-slate-950'}`}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          {agent.status === 'completed' && <Check className="w-3 h-3 text-emerald-400" />}
                          {agent.status === 'running' && <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping shrink-0" />}
                          {agent.status === 'idle' && <span className="w-1.5 h-1.5 bg-slate-800 rounded-full shrink-0" />}
                          <span className={`font-bold font-sans ${isActive ? 'text-indigo-300' : 'text-slate-300'}`}>{agent.name}</span>
                          <span className="text-[9px] text-slate-500 font-mono">({agent.role})</span>
                        </div>
                        <div>
                          {agent.status === 'running' && (
                            <span className="text-[9px] text-indigo-400 font-semibold animate-pulse font-mono uppercase">Thinking...</span>
                          )}
                          {agent.status === 'completed' && (
                            <span className="text-[9px] text-emerald-400/80 font-mono font-bold uppercase">Ready</span>
                          )}
                          {agent.status === 'idle' && (
                            <span className="text-[9px] text-slate-600 font-mono font-semibold uppercase">Pending</span>
                          )}
                        </div>
                      </div>
                      
                      {agent.status === 'running' && (
                        <div className="mt-1.5 space-y-1">
                          <div className="h-2 w-full animate-shimmer rounded bg-slate-800" />
                          <div className="h-2 w-4/5 animate-shimmer rounded bg-slate-800" />
                        </div>
                      )}

                      {agent.status === 'completed' && (
                        <p className="mt-1 text-[10px] text-slate-400 leading-normal font-mono select-text bg-slate-950/50 p-1.5 rounded border border-slate-900">{agent.result}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Dynamic iOS Safety Gate Modal (Sliding Draw Sheet) */}
        {showSmsModal && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-50 flex flex-col justify-end animate-in fade-in duration-300">
            <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 space-y-4 animate-in slide-in-from-bottom duration-300">
              
              {/* Modal Drag Handle */}
              <div className="flex justify-center -mt-2.5 mb-2">
                <div className="w-12 h-1 bg-slate-700 rounded-full" />
              </div>

              {/* Title Header */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h4 className="text-sm font-extrabold tracking-tight text-white font-sans uppercase">
                      {labels.approving}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">Emergency Approval Gate</span>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSmsModal(false)}
                  className="p-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Interactive SMS Preview Card */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden shadow-inner bg-slate-950/60 p-4">
                <div className="flex justify-between items-center border-b border-slate-850 pb-2 mb-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                    <span>TO: Emergency Contacts</span>
                  </div>
                  <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-mono font-extrabold">SMS DRAFT</span>
                </div>
                
                <p className="text-xs text-slate-200 font-mono leading-relaxed bg-indigo-950/15 border border-indigo-950/45 p-3 rounded-xl select-text">
                  {getDraftedSmsText()}
                </p>

                <div className="mt-3 flex gap-2 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1 font-mono"><Users className="w-3 h-3 text-indigo-400" /> Yen (Spouse)</span>
                  <span className="flex items-center gap-1 font-mono"><MapPin className="w-3 h-3 text-indigo-400" /> Smart Live GPS Attached</span>
                </div>
              </div>

              {/* Confirmation Action State Controls */}
              {smsStatus === 'idle' && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button 
                    onClick={() => setShowSmsModal(false)}
                    className="border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold py-3 px-4 rounded-xl text-xs active:scale-95 transition-all"
                  >
                    Hold / Edit
                  </button>
                  <button 
                    onClick={handleApproveSms}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/15"
                  >
                    <Send className="w-3.5 h-3.5" /> Approve & Send
                  </button>
                </div>
              )}

              {smsStatus === 'sending' && (
                <div className="py-4 flex flex-col items-center justify-center">
                  <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
                  <span className="text-xs text-slate-300 font-bold tracking-tight">Encrypting & transmitting satellite SMS...</span>
                </div>
              )}

              {smsStatus === 'sent' && (
                <div className="py-4 flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mb-2 shadow-lg">
                    <Check className="w-6 h-6 stroke-[3]" />
                  </div>
                  <span className="text-xs text-emerald-400 font-bold tracking-tight mb-0.5">{labels.sent}</span>
                  <span className="text-[10px] text-slate-500 font-mono">Message delivered to 1 contact</span>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Sticky Global Control Bottom Bar */}
        <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 backdrop-blur-lg border-t border-slate-900 px-5 py-4 flex justify-between items-center z-40">
          <div className="flex gap-1.5 items-center">
            <Compass className="w-5 h-5 text-indigo-400 animate-spin" style={{ animationDuration: '6s' }} />
            <div className="flex flex-col">
              <span className="text-[11px] font-extrabold text-slate-200 leading-none tracking-wide font-sans uppercase">Mamori AI</span>
              <span className="text-[9px] text-slate-500 font-mono leading-none mt-0.5">Offline-Ready v1.0.0</span>
            </div>
          </div>

          <div className="flex gap-2">
            {currentStep >= 0 && (
              <button 
                onClick={handleTriggerAlert}
                disabled={isSimulating}
                className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-850 active:scale-95 disabled:opacity-50 transition"
                title="Restart Replay"
              >
                <RotateCcw className="w-4 h-4 text-slate-400" />
              </button>
            )}
            <button 
              onClick={handleTriggerAlert}
              disabled={isSimulating}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-750 text-white text-[11px] font-extrabold py-2 px-4 rounded-xl shadow-md hover:shadow-indigo-600/10 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5" />
              {currentStep >= 0 ? 'Replay alert' : 'TRIGGER ALERT'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
