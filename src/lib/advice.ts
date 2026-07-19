import type { ActionStep, Hazard, PersonalContext } from '@/types/domain';
import type { LatLng } from '@/services/geolocation';
import { getShelterInfo } from '@/lib/shelter';

export interface AdviceInput {
  liveSteps: ActionStep[] | null;
  personalContext: PersonalContext;
  activeHazard: Hazard;
  dynamicMarkers: any[];
  userPos: LatLng | null;
}

// Deterministic multilingual evacuation steps, tailored to the profile + hazard.
// Used as a fallback when the Gemini pipeline has not produced live steps.
export function buildAdvice({ liveSteps, personalContext, activeHazard, dynamicMarkers, userPos }: AdviceInput): ActionStep[] {
  if (liveSteps && liveSteps.length) return liveSteps;
  const { language, floor, companions, mobility } = personalContext;

  if (activeHazard === 'earthquake') {
    const steps: ActionStep[] = [];
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
    const shelterInfo = getShelterInfo(userPos, dynamicMarkers);
    const shelter = `${shelterInfo.name} (${shelterInfo.distance})`;
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
          : (language === 'English' ? "Ground floor vulnerable. Climb to 4th floor or higher in nearest strong structure." : language === 'Chinese' ? "低楼层极其危险。请立即爬到附近坚固建筑的4层 or 以上。" : language === 'Vietnamese' ? "Tầng trệt vô cùng nguy hiểm. Di chuyển lên tầng 4 hoặc cao hơn của tòa nhà kiên cố." : "低階は極めて危険。頑丈なビルの4階以上に上ってください。")
      },
      {
        num: "3",
        title: language === 'English' ? "Do NOT Drive or Use Elevators" : language === 'Chinese' ? "切勿驾车或乘电梯" : language === 'Vietnamese' ? "KHÔNG tự lái xe hay dùng thang máy" : "運転およびエレベーター禁止",
        desc: language === 'English' ? "Road gridlock and power outages imminent. Evacuate on foot." : language === 'Chinese' ? "交通瘫痪及停电迫在眉睫。请徒步避难。" : language === 'Vietnamese' ? "Giao thông dễ tắc nghẽn & mất điện diện rộng. Đi bộ thoát hiểm." : "渋滞と停電の恐れ。徒歩での避難を徹底してください。"
      }
    ];
  }
}
