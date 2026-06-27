import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:async';

void main() {
  // Lock orientation to portrait for a realistic mobile phone app feel
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
  ]);
  runApp(const MamoriApp());
}

class MamoriApp extends StatelessWidget {
  const MamoriApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Mamori AI',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF0F172A), // Slate 900
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF8B5CF6), // Violet 500
          secondary: Color(0xFF10B981), // Emerald 500
          surface: Color(0xFF1E293B), // Slate 800
          error: Color(0xFFEF4444), // Red 500
        ),
        cardTheme: CardTheme(
          color: const Color(0xFF1E293B),
          elevation: 8,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFF334155), width: 1),
          ),
        ),
      ),
      home: const MainDashboard(),
    );
  }
}

// Data Classes for Context Configs
enum HazardType { earthquake, typhoon, tsunami }
enum LanguageType { english, chinese, vietnamese, japanese }
enum LocationType { shibuya, minato, shinjuku }
enum FloorType { highFloor, groundFloor, basement }
enum CompanionType { solo, withChild, withElderly }
enum MobilityType { mobile, wheelchair }

class AgentState {
  final String id;
  final String name;
  final String role;
  String status; // 'idle', 'running', 'completed'
  String result;

  AgentState({
    required this.id,
    required this.name,
    required this.role,
    this.status = 'idle',
    this.result = '',
  });
}

class MainDashboard extends StatefulWidget {
  const MainDashboard({super.key});

  @override
  State<MainDashboard> createState() => _MainDashboardState();
}

class _MainDashboardState extends State<MainDashboard> {
  // Settings States
  HazardType _activeHazard = HazardType.earthquake;
  LanguageType _selectedLanguage = LanguageType.english;
  LocationType _selectedLocation = LocationType.shibuya;
  FloorType _selectedFloor = FloorType.highFloor;
  CompanionType _selectedCompanion = CompanionType.withChild;
  MobilityType _selectedMobility = MobilityType.mobile;

  // Pipeline execution states
  bool _isSimulating = false;
  int _currentStep = -1;
  String _smsStatus = 'idle'; // 'idle', 'sending', 'sent'

  // Agents Definition
  final List<AgentState> _agents = [
    AgentState(id: 'situation', name: 'Situation Agent', role: 'Hazard Analysis'),
    AgentState(id: 'personal', name: 'Personal Context Agent', role: 'Vulnerability Analysis'),
    AgentState(id: 'route', name: 'Route & Shelter Agent', role: 'Evacuation Mapping'),
    AgentState(id: 'translate', name: 'Translate & Comms Agent', role: 'Language Synthesis'),
    AgentState(id: 'commander', name: 'Commander Agent', role: 'Synthesis & Command'),
  ];

  // Static label translations
  final Map<LanguageType, Map<String, String>> _labels = {
    LanguageType.english: {
      'welcome': "Peace of Mind",
      'trigger': "TRIGGER ALERT",
      'replay': "Replay Alert",
      'approving': "Human-in-the-Loop Gate",
      'instructions': "DO THIS NOW",
      'familyMsg': "Draft Emergency Message",
      'sent': "Emergency SMS Sent!",
      'analyzing': "Co-pilot reasoning...",
      'config': "Demo Configurations",
    },
    LanguageType.chinese: {
      'welcome': "安心保驾",
      'trigger': "触发警报",
      'replay': "重新播放",
      'approving': "人工安全闸",
      'instructions': "立即执行以下操作",
      'familyMsg': "紧急短信草稿",
      'sent': "紧急短信已成功发送！",
      'analyzing': "副驾驶智能推理中...",
      'config': "演示参数配置",
    },
    LanguageType.vietnamese: {
      'welcome': "An Tâm Tuyệt Đối",
      'trigger': "KÍCH HOẠT SƠ ĐỒ",
      'replay': "Chạy lại kịch bản",
      'approving': "Cổng Phê Duyệt Nhân Sự",
      'instructions': "HÀNH ĐỘNG NGAY",
      'familyMsg': "Bản Nháp Tin Nhắn Khẩn",
      'sent': "Tin nhắn khẩn đã gửi!",
      'analyzing': "Trợ lý đang tính toán...",
      'config': "Cấu Hình Kịch Bản",
    },
    LanguageType.japanese: {
      'welcome': "安心・安全",
      'trigger': "デモアラート起動",
      'replay': "アラート再実行",
      'approving': "ヒューマン・ゲートウェイ",
      'instructions': "今すぐ実行すべき行動",
      'familyMsg': "緊急連絡メッセージ案",
      'sent': "緊急メッセージ送信完了！",
      'analyzing': "コパイロットが推論しています...",
      'config': "デモ設定項目",
    }
  };

  // Get active translation labels
  Map<String, String> get labels => _labels[_selectedLanguage]!;

  // Dynamic SMS Text compiler
  String getDraftedSmsText() {
    final lang = _selectedLanguage;
    final floorStr = _selectedFloor == FloorType.highFloor ? "9" : _selectedFloor == FloorType.groundFloor ? "1" : "Basement";
    
    if (_activeHazard == HazardType.earthquake) {
      if (lang == LanguageType.english) return "Alert: Strong quake in Shibuya. We're safe (floor $floorStr, with child). Heading to Miyashita Park. Tracker: https://mamori.ai/t/shib";
      if (lang == LanguageType.chinese) return "警告：涉谷发生强震。我们安全（位于$floorStr楼，带孩子）。正撤往宫下公园。追踪链接: https://mamori.ai/t/shib";
      if (lang == LanguageType.vietnamese) return "Cảnh báo: Động đất mạnh ở Shibuya. Chúng tôi ổn (tầng $floorStr, đi cùng con nhỏ). Đang tới Công viên Miyashita. Bản đồ: https://mamori.ai/t/shib";
      return "【緊急連絡】渋谷で強い地震。無事です（$floorStr階・子供同伴）。宮下公園へ移動します。現在地：https://mamori.ai/t/shib";
    } else if (_activeHazard == HazardType.typhoon) {
      if (lang == LanguageType.english) return "Alert: Category 4 Typhoon in Tokyo. Staying inside on floor $floorStr. Secured. Track: https://mamori.ai/t/shib";
      if (lang == LanguageType.chinese) return "警告：台风4级登陆东京。我们在$floorStr楼室内避险。一切安好。追踪: https://mamori.ai/t/shib";
      if (lang == LanguageType.vietnamese) return "Cảnh báo: Bão Cấp 4 ở Tokyo. Đang trú ẩn ở tầng $floorStr. An toàn. Định vị: https://mamori.ai/t/shib";
      return "【緊急連絡】大型台風接近中。安全に$floorStr階に留まっています。無事です。GPS：https://mamori.ai/t/shib";
    } else {
      if (lang == LanguageType.english) return "Alert: Major Tsunami Warning! Evacuating to safe vertical height. Position: Shibuya. Track: https://mamori.ai/t/shib";
      if (lang == LanguageType.chinese) return "紧急警报：大海啸预警！我们正前往高处垂直避难。涩谷。追踪: https://mamori.ai/t/shib";
      if (lang == LanguageType.vietnamese) return "Cảnh báo khẩn: Sóng thần lớn! Đang sơ tán lên vùng cao an toàn. Shibuya. Định vị: https://mamori.ai/t/shib";
      return "【大津波警報】津波から避難するため、高台へ向かっています。現在地：渋谷。URL: https://mamori.ai/t/shib";
    }
  }

  // Dynamic Instructions compiled based on configs
  List<Map<String, String>> getDynamicAdvice() {
    final lang = _selectedLanguage;
    final List<Map<String, String>> steps = [];

    if (_activeHazard == HazardType.earthquake) {
      // Step 1: Head Protection
      if (_selectedFloor == FloorType.highFloor) {
        steps.add({
          'title': lang == LanguageType.english ? "Drop, Cover, Hold" : lang == LanguageType.chinese ? "伏地、遮挡、手扶" : lang == LanguageType.vietnamese ? "Nằm xuống, Che chắn, Giữ chặt" : "伏せ、頭を守り、動かない",
          'desc': lang == LanguageType.english ? "High rise shaking. Stay away from glass window walls." : lang == LanguageType.chinese ? "高楼层摇晃剧烈。请远离外墙大玻璃。" : lang == LanguageType.vietnamese ? "Tòa nhà cao tầng rung lắc. Tránh xa các vách kính." : "高層ビル特有の揺れ。窓ガラスから離れてください。"
        });
      } else if (_selectedFloor == FloorType.groundFloor) {
        steps.add({
          'title': lang == LanguageType.english ? "Evacuate Outwards" : lang == LanguageType.chinese ? "立即疏散到室外" : lang == LanguageType.vietnamese ? "Sơ tán ra bên ngoài" : "屋外へ避難してください",
          'desc': lang == LanguageType.english ? "Ground floor risks. Evacuate immediately if safety exits are clear." : lang == LanguageType.chinese ? "低楼层风险。安全通道畅通时请立刻前往开阔地。" : lang == LanguageType.vietnamese ? "Nguy cơ sập đổ. Sơ tán ngay lập tức nếu lối thoát hiểm an toàn." : "低階のリスク。安全出口が確保されている場合は即座に避難。"
        });
      } else {
        steps.add({
          'title': lang == LanguageType.english ? "Protect Head & Move Up" : lang == LanguageType.chinese ? "护住头部并往上撤" : lang == LanguageType.vietnamese ? "Bảo vệ đầu & di chuyển lên" : "頭を保護し、地上へ避難",
          'desc': lang == LanguageType.english ? "Basement trap risk. Move to ground level once heavy shaking stops." : lang == LanguageType.chinese ? "地下室积水缺氧风险。剧烈摇晃停止后请上爬到地面。" : lang == LanguageType.vietnamese ? "Nguy cơ mắc kẹt dưới hầm. Di chuyển lên mặt đất khi hết rung lắc." : "地下での閉じ込めリスク。揺れが収まり次第、地上へ移動。"
        });
      }

      // Step 2: Companion support
      steps.add({
        'title': lang == LanguageType.english ? "Take Stairs, NOT Elevator" : lang == LanguageType.chinese ? "走安全通道，禁用电梯" : lang == LanguageType.vietnamese ? "Đi cầu thang bộ, KHÔNG dùng thang máy" : "階段を使用（エレベーター禁止）",
        'desc': _selectedCompanion == CompanionType.withChild
          ? (lang == LanguageType.english ? "Secure stroller, carry child. Walk calmly down." : lang == LanguageType.chinese ? "抱起孩子，折叠婴儿车。保持秩序下楼。" : lang == LanguageType.vietnamese ? "Gấp xe đẩy, bế trẻ em. Đi bộ bình tĩnh." : "ベビーカーは畳み、子供を抱きかかえて歩いてください。")
          : _selectedCompanion == CompanionType.withElderly
          ? (lang == LanguageType.english ? "Support companion. Avoid rushing, pace yourselves." : lang == LanguageType.chinese ? "搀扶长辈。避开推挤，稳步前行。" : lang == LanguageType.vietnamese ? "Hỗ trợ cha mẹ lớn tuổi. Tránh chen lấn, đi vững chắc." : "高齢の家族をサポートしてください。焦らず、一歩ずつ下りてください。")
          : (lang == LanguageType.english ? "Keep hands free. Walk, do not run." : lang == LanguageType.chinese ? "双手腾空，快走，不要在梯道奔跑。" : lang == LanguageType.vietnamese ? "Giữ hai tay tự do. Đi bộ, không chạy." : "両手を空けてください。走らず歩いてください。")
      });

      // Step 3: Route Plan
      final shelter = _selectedLocation == LocationType.shibuya ? 'Miyashita Park (400m)' : _selectedLocation == LocationType.minato ? 'Shiba Park (650m)' : 'Shinjuku Gyoen (800m)';
      steps.add({
        'title': lang == LanguageType.english ? "Evacuate to $shelter" : lang == LanguageType.chinese ? "前往 $shelter 避难" : lang == LanguageType.vietnamese ? "Sơ tán đến $shelter" : "$shelter へ避難",
        'desc': _selectedMobility == MobilityType.wheelchair
          ? (lang == LanguageType.english ? "Route is pre-vetted with ADA flat access ramps." : lang == LanguageType.chinese ? "该路线已预规划无障碍轮椅坡道（避开阶梯和砖墙）。" : lang == LanguageType.vietnamese ? "Tuyến đường đã được xác thực hỗ trợ xe lăn vô ngại." : "車椅子対応のバリアフリー経路が確保されています。")
          : (lang == LanguageType.english ? "Direct, hazard-free sidewalk path mapped below." : lang == LanguageType.chinese ? "下方已为您规划了无掉落瓦片或坍塌外墙的避险路线。" : lang == LanguageType.vietnamese ? "Bản đồ hiển thị tuyến đường đi bộ an toàn, không vật cản." : "落下物の危険が少ないルートが以下にマッピングされています。")
      });
    } else if (_activeHazard == HazardType.typhoon) {
      steps.addAll([
        {
          'title': lang == LanguageType.english ? "Shelter Indoors" : "室内避险",
          'desc': lang == LanguageType.english ? "Extreme category 4 winds. Lock all glass windows and storm shields." : "140km/h强风过境。关闭所有窗户、拉上遮阳防护网。"
        },
        {
          'title': lang == LanguageType.english ? "Move Away From Windows" : "远离外立面窗户",
          'desc': _selectedFloor == FloorType.basement 
            ? (lang == LanguageType.english ? "Basement flooding threat! Move to upper floors immediately." : "地下室灌水倒灌警告！请立刻撤离至地上二层以上。")
            : (lang == LanguageType.english ? "Debris impact hazard. Stay in inner-rooms or hallways." : "防玻璃震碎。请待在走廊或没有外窗的密闭核心舱。")
        }
      ]);
    } else {
      // Tsunami
      steps.addAll([
        {
          'title': lang == LanguageType.english ? "Seek Immediate High Ground" : "立刻前往高处避难",
          'desc': lang == LanguageType.english ? "Tsunami wave alert height 3m+. You must climb immediately." : "海啸预计浪高3米以上。立刻往高台或混凝土建筑物高层移动。"
        },
        {
          'title': lang == LanguageType.english ? "Vertical Evacuation" : "执行垂直避难",
          'desc': _selectedFloor == FloorType.highFloor
            ? (lang == LanguageType.english ? "Stay on current 9th floor. You are well above wave crest height." : "留在当前9楼。您的高度已大幅超过预估海啸高，千万不要下楼！")
            : (lang == LanguageType.english ? "Ground floor vulnerable. Climb to 4th floor or higher in nearest strong structure." : "一楼极其脆弱。请立刻进入最近的坚固大楼攀爬至4层以上。")
        }
      ]);
    }

    return steps;
  }

  // Trigger simulated Agent loop
  void _runPipeline() {
    setState(() {
      for (var a in _agents) {
        a.status = 'idle';
        a.result = '';
      }
      _isSimulating = true;
      _currentStep = 0;
      _smsStatus = 'idle';
    });

    _executeNextAgent();
  }

  void _executeNextAgent() {
    if (_currentStep < 0 || _currentStep >= _agents.length) {
      setState(() {
        _isSimulating = false;
      });
      // Show Safety Gate Modal Sheet at completion
      _showSmsApprovalSheet();
      return;
    }

    setState(() {
      _agents[_currentStep].status = 'running';
    });

    // Simulated network/API speed latency
    Timer(const Duration(milliseconds: 1800), () {
      if (!mounted) return;
      setState(() {
        final agent = _agents[_currentStep];
        agent.status = 'completed';
        
        switch (agent.id) {
          case 'situation':
            agent.result = _activeHazard == HazardType.earthquake 
              ? "M7.2 Earthquake detected. Shibuya intensity JMA 5-Upper. Tsunami threat: ADVISORY (0.5m waves expected)." 
              : _activeHazard == HazardType.typhoon
              ? "Category 4 Typhoon making landfall in Kanto. Sustained winds 140km/h. Heavy rain 50mm/hr."
              : "M8.4 Subduction Quake. Shibuya intensity JMA 6-Lower. Major Tsunami Warning (Waves 3.2m in 8 mins).";
            break;
          case 'personal':
            final langStr = _selectedLanguage.toString().split('.').last.toUpperCase();
            final floorStr = _selectedFloor == FloorType.highFloor ? '9th Floor' : _selectedFloor == FloorType.groundFloor ? 'Ground Floor' : 'Basement';
            final companionStr = _selectedCompanion == CompanionType.withChild ? 'With Child' : _selectedCompanion == CompanionType.withElderly ? 'With Elderly' : 'Solo';
            agent.result = "User context parsed: Lang: $langStr, Loc: ${_selectedLocation.toString().split('.').last.toUpperCase()}, Floor: $floorStr, Group: $companionStr, Mobility: ${_selectedMobility.toString().split('.').last}. Vulnerability: HIGH.";
            break;
          case 'route':
            final shelter = _selectedLocation == LocationType.shibuya ? 'Miyashita Park (Open, elevated shelter, 400m, ADA compliant flat path)' : _selectedLocation == LocationType.minato ? 'Shiba Park (Open, 650m)' : 'Shinjuku Gyoen (Open, 800m)';
            agent.result = "Closest safe shelter: $shelter. Route safe of unreinforced masonry structures. ADA ramps verified.";
            break;
          case 'translate':
            agent.result = "Draft text generated in ${_selectedLanguage.toString().split('.').last.toUpperCase()}. Emergency contact parsed. Human validation required.";
            break;
          case 'commander':
            agent.result = "Command list compiled with ${getDynamicAdvice().length} hyper-personalized steps. UI layout dispatched.";
            break;
        }

        _currentStep++;
      });
      _executeNextAgent();
    });
  }

  // Sliding sheet modal representing the Human-in-the-loop Gate
  void _showSmsApprovalSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1E293B),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      isScrollControlled: true,
      builder: (context) {
        return StatefulBuilder(
          builder: (BuildContext context, StateSetter modalSetState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 12,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: MainAxisAlignment.start,
                children: [
                  // Center drag handle
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: const Color(0xFF475569),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      const Icon(CupertinoIcons.shield_fill, color: Color(0xFF8B5CF6), size: 22),
                      const SizedBox(width: 8),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            labels['approving']!.toUpperCase(),
                            style: const TextStyle(fontWeight: FontWeight.black, fontSize: 13, letterSpacing: 0.5),
                          ),
                          const Text(
                            "Emergency Approval Gate",
                            style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10),
                          ),
                        ],
                      ),
                      const Spacer(),
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(CupertinoIcons.xmark, size: 18),
                      )
                    ],
                  ),
                  const SizedBox(height: 16),
                  // Mock message balloon
                  Container(
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFF334155)),
                    ),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(CupertinoIcons.chat_bubble_2_fill, color: Color(0xFF8B5CF6), size: 16),
                            SizedBox(width: 6),
                            Text("TO: Emergency Contacts", style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontFamily: 'monospace')),
                            Spacer(),
                            Text("SMS DRAFT", style: TextStyle(color: Color(0xFF8B5CF6), fontWeight: FontWeight.bold, fontSize: 9)),
                          ],
                        ),
                        const SizedBox(height: 10),
                        SelectableText(
                          getDraftedSmsText(),
                          style: const TextStyle(fontSize: 12, fontFamily: 'monospace', height: 1.5, color: Color(0xFFE2E8F0)),
                        ),
                        const SizedBox(height: 12),
                        const Divider(color: Color(0xFF334155), height: 1),
                        const SizedBox(height: 8),
                        const Row(
                          children: [
                            Icon(CupertinoIcons.group_solid, size: 14, color: Color(0xFF8B5CF6)),
                            SizedBox(width: 6),
                            Text("Yen (Spouse)", style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                            SizedBox(width: 12),
                            Icon(CupertinoIcons.location_solid, size: 14, color: Color(0xFF8B5CF6)),
                            SizedBox(width: 4),
                            Text("Smart Live GPS Attached", style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                          ],
                        )
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Actions status
                  if (_smsStatus == 'idle')
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => Navigator.pop(context),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              side: const BorderSide(color: Color(0xFF334155)),
                            ),
                            child: const Text("Hold / Edit", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () {
                              modalSetState(() {
                                _smsStatus = 'sending';
                              });
                              setState(() {
                                _smsStatus = 'sending';
                              });
                              Timer(const Duration(milliseconds: 1500), () {
                                modalSetState(() {
                                  _smsStatus = 'sent';
                                });
                                setState(() {
                                  _smsStatus = 'sent';
                                });
                                Timer(const Duration(milliseconds: 1500), () {
                                  Navigator.pop(context);
                                });
                              });
                            },
                            icon: const Icon(CupertinoIcons.paperplane_fill, size: 14),
                            label: const Text("Approve & Send", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF8B5CF6),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                          ),
                        ),
                      ],
                    ),

                  if (_smsStatus == 'sending')
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 16),
                      child: Column(
                        children: [
                          CircularProgressIndicator(strokeWidth: 3, color: Color(0xFF8B5CF6)),
                          SizedBox(height: 12),
                          Text("Encrypting & transmitting satellite SMS...", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                        ],
                      ),
                    ),

                  if (_smsStatus == 'sent')
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      child: Column(
                        children: [
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: const Color(0xFF10B981).withOpacity(0.1),
                              borderRadius: BorderRadius.circular(24),
                              border: Border.all(color: const Color(0xFF10B981).withOpacity(0.3)),
                            ),
                            child: const Icon(CupertinoIcons.check_mark, color: Color(0xFF10B981), size: 24),
                          ),
                          const SizedBox(height: 12),
                          Text(labels['sent']!, style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontSize: 13)),
                          const SizedBox(height: 4),
                          const Text("Message delivered to 1 contact", style: TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                        ],
                      ),
                    ),
                ],
              ),
            );
          },
        );
      },
    ).then((_) {
      setState(() {
        if (_smsStatus == 'sent') {
          _smsStatus = 'idle';
        }
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Custom Header Logo
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(CupertinoIcons.shield_fill, color: Color(0xFF8B5CF6), size: 28),
                  const SizedBox(width: 8),
                  const Text(
                    'Mamori AI',
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.black, letterSpacing: -0.5),
                  ),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, py: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFF8B5CF6).withOpacity(0.15),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text("安心守り", style: TextStyle(fontSize: 9, color: Color(0xFF8B5CF6), fontWeight: FontWeight.bold)),
                  )
                ],
              ),
              const SizedBox(height: 4),
              const Center(
                child: Text(
                  "Premium Multi-Agent Disaster Co-pilot",
                  style: TextStyle(color: Color(0xFF64748B), fontSize: 11),
                ),
              ),
              const SizedBox(height: 20),

              // Configuration Card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          const Icon(CupertinoIcons.settings, size: 14, color: Color(0xFF94A3B8)),
                          const SizedBox(width: 6),
                          Text(
                            labels['config']!.toUpperCase(),
                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.extrabold, letterSpacing: 1.0, color: Color(0xFF94A3B8)),
                          ),
                          const Spacer(),
                          // Mini Hazard selector pill
                          Container(
                            decoration: BoxDecoration(
                              color: const Color(0xFF0F172A),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            padding: const EdgeInsets.all(2),
                            child: Row(
                              children: [
                                _buildHazardButton(HazardType.earthquake, CupertinoIcons.waveform_path, "Quake"),
                                _buildHazardButton(HazardType.typhoon, CupertinoIcons.wind, "Typhoon"),
                                _buildHazardButton(HazardType.tsunami, CupertinoIcons.waveform, "Tsunami"),
                              ],
                            ),
                          )
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Selection selectors grid
                      _buildConfigGrid(),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Live Warning card
              if (_currentStep >= 0) _buildWarningCard(),

              // Commander Instruction Steps (Synthesized)
              if (_currentStep >= 5) ...[
                const SizedBox(height: 16),
                _buildSynthesizedAdvicePanel(),
              ],

              // Pipeline progress state
              if (_currentStep >= 0) ...[
                const SizedBox(height: 16),
                _buildPipelineProgressCard(),
              ],

              // Empty screen standby state
              if (_currentStep < 0) ...[
                const SizedBox(height: 40),
                Center(
                  child: Column(
                    children: [
                      Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(36),
                          border: Border.all(color: const Color(0xFF334155)),
                        ),
                        child: const Icon(CupertinoIcons.device_phone_portrait, size: 36, color: Color(0xFF8B5CF6)),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        "System Pre-Armed & Ready",
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                      const SizedBox(height: 6),
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 36),
                        child: Text(
                          "Preloaded with Shibuya designated shelter databases. Run simulation alerts on stage.",
                          textAlign: Center,
                          style: TextStyle(color: Color(0xFF64748B), fontSize: 11, height: 1.4),
                        ),
                      ),
                      const SizedBox(height: 24),
                      ElevatedButton.icon(
                        onPressed: _runPipeline,
                        icon: const Icon(CupertinoIcons.play_arrow_solid, size: 14),
                        label: Text(labels['trigger']!),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF8B5CF6),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9999)),
                        ),
                      )
                    ],
                  ),
                )
              ],
              const SizedBox(height: 80), // spacer for sticky bottom bar
            ],
          ),
        ),
      ),
      bottomNavigationBar: _buildStickyBottomBar(),
    );
  }

  // Configurations layout
  Widget _buildConfigGrid() {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _buildConfigDropdown<LanguageType>(
                "Language",
                _selectedLanguage,
                LanguageType.values,
                (v) => setState(() => _selectedLanguage = v),
                (v) => v == LanguageType.english ? "🇬🇧 English" : v == LanguageType.chinese ? "🇨🇳 中文" : v == LanguageType.vietnamese ? "🇻🇳 Tiếng Việt" : "🇯🇵 日本語",
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildConfigDropdown<LocationType>(
                "Location",
                _selectedLocation,
                LocationType.values,
                (v) => setState(() => _selectedLocation = v),
                (v) => v.toString().split('.').last.toUpperCase(),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _buildConfigDropdown<FloorType>(
                "Floor Level",
                _selectedFloor,
                FloorType.values,
                (v) => setState(() => _selectedFloor = v),
                (v) => v == FloorType.highFloor ? "9th Floor" : v == FloorType.groundFloor ? "Ground" : "Basement",
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildConfigDropdown<CompanionType>(
                "Companions",
                _selectedCompanion,
                CompanionType.values,
                (v) => setState(() => _selectedCompanion = v),
                (v) => v == CompanionType.solo ? "Solo" : v == CompanionType.withChild ? "With Child" : "With Elderly",
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        _buildConfigDropdown<MobilityType>(
          "Mobility Needs",
          _selectedMobility,
          MobilityType.values,
          (v) => setState(() => _selectedMobility = v),
          (v) => v == MobilityType.mobile ? "Fully Mobile" : "Requires Wheelchair Support",
        ),
      ],
    );
  }

  Widget _buildConfigDropdown<T>(
    String title,
    T current,
    List<T> values,
    ValueChanged<T> onChanged,
    String Function(T) labeler,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(color: Color(0xFF64748B), fontSize: 10)),
        const SizedBox(height: 4),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: const Color(0xFF334155)),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<T>(
              value: current,
              isExpanded: true,
              dropdownColor: const Color(0xFF0F172A),
              icon: const Icon(CupertinoIcons.chevron_down, size: 12, color: Color(0xFF64748B)),
              onChanged: _isSimulating ? null : (v) { if (v != null) onChanged(v); },
              items: values.map((T v) {
                return DropdownMenuItem<T>(
                  value: v,
                  child: Text(labeler(v), style: const TextStyle(fontSize: 11, color: Colors.white)),
                );
              }).toList(),
            ),
          ),
        )
      ],
    );
  }

  Widget _buildHazardButton(HazardType type, IconData icon, String label) {
    final isSelected = _activeHazard == type;
    return GestureDetector(
      onTap: _isSimulating ? null : () => setState(() => _activeHazard = type),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 8, py: 4),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF8B5CF6).withOpacity(0.15) : Colors.transparent,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: isSelected ? const Color(0xFF8B5CF6).withOpacity(0.3) : Colors.transparent),
        ),
        child: Row(
          children: [
            Icon(icon, size: 10, color: isSelected ? const Color(0xFF8B5CF6) : const Color(0xFF64748B)),
            const SizedBox(width: 4),
            Text(label, style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: isSelected ? const Color(0xFF8B5CF6) : const Color(0xFF64748B))),
          ],
        ),
      ),
    );
  }

  // Alert Feed panel layout
  Widget _buildWarningCard() {
    final isQuake = _activeHazard == HazardType.earthquake;
    final isTyphoon = _activeHazard == HazardType.typhoon;

    Color cardBg = isQuake ? const Color(0xFF7F1D1D).withOpacity(0.2) : isTyphoon ? const Color(0xFF0C4A6E).withOpacity(0.2) : const Color(0xFF78350F).withOpacity(0.2);
    Color borderC = isQuake ? const Color(0xFFEF4444).withOpacity(0.4) : isTyphoon ? const Color(0xFF0284C7).withOpacity(0.4) : const Color(0xFFD97706).withOpacity(0.4);
    Color textC = isQuake ? const Color(0xFFFECACA) : isTyphoon ? const Color(0xFFE0F2FE) : const Color(0xFFFEF3C7);

    return Container(
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderC),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.between,
            children: [
              Row(
                children: [
                  const Icon(CupertinoIcons.exclamationmark_triangle_fill, color: Colors.orange, size: 14),
                  const SizedBox(width: 6),
                  Text(
                    isQuake ? "JMA EARTHQUAKE ALERT" : isTyphoon ? "TYPHOON WARNING" : "TSUNAMI WARNING",
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: textC, letterSpacing: 0.5),
                  ),
                ],
              ),
              const Text("LIVE FEED", style: TextStyle(fontSize: 8, color: Colors.grey, fontFamily: 'monospace')),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            isQuake 
              ? "気象庁 地震緊急警報 (JMA)\n千葉県東方沖でマグニチュード7.2の強い地震発生。東京都渋谷区で強い揺れ（震度5強以上）に警戒してください。"
              : isTyphoon
              ? "特別台風警報 (JMA)\n非常に強い台風が関東地方に接近。渋谷区周辺で最大風速140km/hに達する見込み。不要不急の外出を控えてください。"
              : "大津波警報発表 (JMA)\n渋谷区沿岸低地等に危険到達。津波予想高3.2m。直ちに高台や避難ビルなどの安全な場所へ避難を開始してください。",
            style: TextStyle(fontSize: 11, color: textC, fontFamily: 'monospace', height: 1.4),
          )
        ],
      ),
    );
  }

  // Synthesized instructions commands card
  Widget _buildSynthesizedAdvicePanel() {
    final adviceList = getDynamicAdvice();
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B).withOpacity(0.4),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(CupertinoIcons.shield_fill, color: Color(0xFF8B5CF6), size: 18),
              const SizedBox(width: 8),
              Text(
                labels['instructions']!,
                style: const TextStyle(fontWeight: FontWeight.black, fontSize: 13, letterSpacing: 0.5, color: Color(0xFFC084FC)),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: adviceList.length,
            separatorBuilder: (c, i) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final step = adviceList[index];
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      color: const Color(0xFF8B5CF6).withOpacity(0.1),
                      border: Border.all(color: const Color(0xFF8B5CF6).withOpacity(0.3)),
                      shape: BoxShape.circle,
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      "${index + 1}",
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Color(0xFFC084FC)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(step['title']!, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.white)),
                        const SizedBox(height: 4),
                        Text(step['desc']!, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11, height: 1.4)),
                      ],
                    ),
                  )
                ],
              );
            },
          ),
          const SizedBox(height: 16),
          const Divider(color: Color(0xFF334155), height: 1),
          const SizedBox(height: 12),
          GestureDetector(
            onTap: _showSmsApprovalSheet,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(CupertinoIcons.check_mark_circle_fill, size: 14, color: Color(0xFF10B981)),
                    SizedBox(width: 6),
                    Text("Auto-coordinated message ready", style: TextStyle(color: Color(0xFF10B981), fontSize: 10)),
                  ],
                ),
                Row(
                  children: [
                    Text(labels['approving']!, style: const TextStyle(color: Color(0xFF8B5CF6), fontSize: 10, fontWeight: FontWeight.bold)),
                    const SizedBox(width: 4),
                    const Icon(CupertinoIcons.chevron_right, size: 10, color: Color(0xFF8B5CF6)),
                  ],
                )
              ],
            ),
          )
        ],
      ),
    );
  }

  // Orchestrator Logs widget layout
  Widget _buildPipelineProgressCard() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B).withOpacity(0.2),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              const Icon(CupertinoIcons.bolt_horizontal_circle_fill, size: 14, color: Color(0xFF8B5CF6)),
              const SizedBox(width: 6),
              const Text("MULTI-AGENT PIPELINE", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 0.5)),
            ],
          ),
          const SizedBox(height: 12),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _agents.length,
            separatorBuilder: (c, i) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final agent = _agents[index];
              final isRunning = agent.status == 'running';
              final isCompleted = agent.status == 'completed';

              return AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                decoration: BoxDecoration(
                  color: isRunning ? const Color(0xFF8B5CF6).withOpacity(0.05) : Colors.transparent,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: isRunning ? const Color(0xFF8B5CF6).withOpacity(0.15) : Colors.transparent),
                ),
                padding: const EdgeInsets.all(8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        if (isCompleted) const Icon(CupertinoIcons.check_mark_circled_solid, size: 12, color: Color(0xFF10B981)),
                        if (isRunning) const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF8B5CF6))),
                        if (agent.status == 'idle') Container(width: 6, height: 6, decoration: const BoxDecoration(color: Color(0xFF475569), shape: BoxShape.circle)),
                        const SizedBox(width: 8),
                        Text(agent.name, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: isRunning ? const Color(0xFFC084FC) : Colors.white)),
                        const SizedBox(width: 4),
                        Text("(${agent.role})", style: const TextStyle(fontSize: 8, color: Colors.grey, fontFamily: 'monospace')),
                        const Spacer(),
                        if (isRunning) const Text("RUNNING", style: TextStyle(fontSize: 8, color: Color(0xFF8B5CF6), fontWeight: FontWeight.bold, fontFamily: 'monospace')),
                        if (isCompleted) const Text("COMPLETED", style: TextStyle(fontSize: 8, color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontFamily: 'monospace')),
                      ],
                    ),
                    if (isCompleted && agent.result.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Container(
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F172A).withOpacity(0.4),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        padding: const EdgeInsets.all(8),
                        child: Text(agent.result, style: const TextStyle(fontSize: 9, fontFamily: 'monospace', color: Color(0xFF94A3B8), height: 1.3)),
                      )
                    ]
                  ],
                ),
              );
            },
          )
        ],
      ),
    );
  }

  // Sticky bottom navigation bar for demo triggers
  Widget _buildStickyBottomBar() {
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        border: Border(top: BorderSide(color: Color(0xFF1E293B), width: 1)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              const Icon(CupertinoIcons.compass_fill, size: 18, color: Color(0xFF8B5CF6)),
              const SizedBox(width: 6),
              Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("MAMORI AI", style: TextStyle(fontWeight: FontWeight.black, fontSize: 11, letterSpacing: 0.5)),
                  Text(labels['welcome']!, style: const TextStyle(fontSize: 8, color: Color(0xFF64748B))),
                ],
              )
            ],
          ),
          Row(
            children: [
              if (_currentStep >= 0)
                IconButton(
                  onPressed: _isSimulating ? null : _runPipeline,
                  icon: const Icon(CupertinoIcons.refresh, size: 16, color: Color(0xFF94A3B8)),
                  style: IconButton.styleFrom(
                    backgroundColor: const Color(0xFF1E293B),
                    padding: const EdgeInsets.all(10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              const SizedBox(width: 8),
              ElevatedButton.icon(
                onPressed: _isSimulating ? null : _runPipeline,
                icon: const Icon(CupertinoIcons.bolt_fill, size: 12),
                label: Text(_currentStep >= 0 ? labels['replay']! : labels['trigger']!, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF8B5CF6),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              )
            ],
          )
        ],
      ),
    );
  }
}
