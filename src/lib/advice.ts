import type { ActionStep, Hazard, PersonalContext } from '@/types/domain';
import type { LatLng } from '@/services/geolocation';
import { getShelterInfo } from '@/lib/shelter';
import { hazardInfo } from '@/constants/hazards';
import {
  isBasement, isGround, isAboveTsunamiLine, groupSlowsYou,
  describeFloor, TSUNAMI_MIN_SAFE_FLOOR
} from '@/lib/profileFormat';

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
    if (isBasement(floor)) {
      steps.push({
        num: "1",
        title: language === 'English' ? "Protect Head & Move Up" : language === 'Chinese' ? "护住头部并往上撤" : language === 'Vietnamese' ? "Bảo vệ đầu & di chuyển lên" : "頭を保護し、地上へ避難",
        desc: language === 'English' ? "Basement trap risk. Move to ground level once heavy shaking stops." : language === 'Chinese' ? "地下陷阱风险。剧烈摇晃停止后请立即前往地面。" : language === 'Vietnamese' ? "Nguy cơ mắc kẹt dưới hầm. Di chuyển lên mặt đất khi hết rung lắc." : "地下での閉じ込めリスク。揺れが収まり次第、地上へ移動。"
      });
    } else if (isGround(floor)) {
      steps.push({
        num: "1",
        title: language === 'English' ? "Evacuate Outwards" : language === 'Chinese' ? "立即疏散到室外" : language === 'Vietnamese' ? "Sơ tán ra bên ngoài" : "屋外へ避難してください",
        desc: language === 'English' ? "Ground floor risks. Evacuate immediately if safety exits are clear." : language === 'Chinese' ? "低楼层风险。安全通道畅通时请立即撤离。" : language === 'Vietnamese' ? "Nguy cơ sập đổ. Sơ tán ngay lập tức nếu lối thoát hiểm an toàn." : "低階のリスク。安全出口が確保されている場合は即座に避難。"
      });
    } else {
      steps.push({
        num: "1",
        title: language === 'English' ? "Drop, Cover, Hold" : language === 'Chinese' ? "伏地、遮挡、手扶" : language === 'Vietnamese' ? "Nằm xuống, Che chắn, Giữ chặt" : "伏せ、頭を守り、動かない",
        desc: language === 'English' ? `Shaking is amplified on ${describeFloor(floor)}. Stay away from glass window walls.` : language === 'Chinese' ? "高楼层摇晃剧烈。请远离玻璃幕墙。" : language === 'Vietnamese' ? "Tòa nhà cao tầng rung lắc. Tránh xa các vách kính." : "高層階では揺れが増幅されます。窓ガラスから離れてください。"
      });
    }

    // Step 2: Elevators
    steps.push({
      num: "2",
      title: language === 'English' ? "Take Stairs, NOT Elevator" : language === 'Chinese' ? "走安全通道，禁用电梯" : language === 'Vietnamese' ? "Đi cầu thang bộ, KHÔNG dùng thang máy" : "階段を使用（エレベーター禁止）",
      desc: companions.needsCarrying
        ? (language === 'English' ? "Carry them and keep both hands supporting. Walk calmly down." : language === 'Chinese' ? "抱住需要搀扶的人，双手托稳。有序下楼。" : language === 'Vietnamese' ? "Bế người cần hỗ trợ, giữ chắc bằng hai tay. Đi bộ bình tĩnh." : "抱きかかえ、両手でしっかり支えて歩いてください。")
        : companions.needsAssistance
        ? (language === 'English' ? "Support anyone who needs it. Avoid rushing, pace yourselves." : language === 'Chinese' ? "扶助需要帮助的人。避免拥挤，稳步前行。" : language === 'Vietnamese' ? "Hỗ trợ người cần giúp đỡ. Tránh chen lấn, đi vững chắc." : "支援が必要な人を支えてください。焦らず、一歩ずつ下りてください。")
        : companions.count > 0
        ? (language === 'English' ? "Keep your group together. Walk, do not run." : language === 'Chinese' ? "保持同行者在一起。小步快走，切勿奔跑。" : language === 'Vietnamese' ? "Giữ cả nhóm đi cùng nhau. Đi bộ, không chạy." : "同行者と離れないでください。走らず歩いてください。")
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
        desc: isBasement(floor)
          ? (language === 'English' ? "Basement flooding threat! Move to upper floors immediately." : language === 'Chinese' ? "地下室积水威胁！请立即转移至高层楼层。" : language === 'Vietnamese' ? "Nguy cơ ngập lụt tầng hầm! Di chuyển ngay lên tầng trên." : "地下浸水のリスク！直ちに上の階に避難してください。")
          : (language === 'English' ? "Debris impact hazard. Stay in inner-rooms or hallways." : language === 'Chinese' ? "碎物撞击危险。请待在无窗的内室或走廊。" : language === 'Vietnamese' ? "Mảnh vỡ có thể văng vào. Trú ẩn trong phòng kín hoặc lối đi giữa nhà." : "飛来物の危険。窓のない内室か廊下で待機してください。")
      },
      {
        num: "3",
        title: language === 'English' ? "Monitor Local Inundation" : language === 'Chinese' ? "监控积水深度" : language === 'Vietnamese' ? "Theo dõi mực nước ngập" : "浸水情報のモニタリング",
        desc: language === 'English' ? "Checking high-ground evacuation path if sea surges occur." : language === 'Chinese' ? "如发生风暴潮，系统将规划高地避难路径。" : language === 'Vietnamese' ? "Sẵn sàng lộ trình sơ tán lên vùng cao nếu có triều cường dâng." : "高潮発生に備え、高台への避難経路を準備しています。"
      }
    ];
  } else if (activeHazard === 'tsunami') {
    return [
      // Step 1 has to agree with step 2. Telling someone on the 20th floor to
      // "climb immediately" and then, a line later, that they may stay put is
      // worse than either message alone — it could send them into a stairwell.
      // The old wording also asserted a 3 m wave height that came from nowhere.
      isAboveTsunamiLine(floor)
        ? {
            num: "1",
            title: language === 'English' ? "Stay High — Do Not Go Down" : language === 'Chinese' ? "留在高处，切勿下楼" : language === 'Vietnamese' ? "Ở trên cao — Không đi xuống" : "高所に留まる（下降禁止）",
            desc: language === 'English' ? `You are already on ${describeFloor(floor)}. Going down now would put you in the water's path.` : language === 'Chinese' ? "您已在高层。此时下楼会进入海啸路径。" : language === 'Vietnamese' ? "Bạn đã ở trên cao. Đi xuống lúc này sẽ vào đường sóng thần." : "既に高所にいます。今下ると津波の進路に入ります。"
          }
        : {
            num: "1",
            title: language === 'English' ? "Seek Immediate High Ground" : language === 'Chinese' ? "立即寻找高处避难" : language === 'Vietnamese' ? "Tìm nơi cao ráo ngay" : "直ちに高台避難",
            desc: language === 'English' ? "Move upward or inland now — do not wait to see the wave." : language === 'Chinese' ? "立即向高处或内陆移动，不要等看到海浪。" : language === 'Vietnamese' ? "Di chuyển lên cao hoặc vào trong đất liền ngay — đừng chờ thấy sóng." : "直ちに高所または内陸へ移動してください。波を見てからでは遅すぎます。"
          },
      {
        num: "2",
        title: language === 'English' ? "Vertical Evacuation" : language === 'Chinese' ? "垂直避难" : language === 'Vietnamese' ? "Sơ tán khẩn cấp theo chiều dọc" : "垂直避難の実行",
        // Never assert "you are above the wave" off the back of a picked option.
        // The claim is now tied to the storey the user actually gave, and still
        // tells them to go higher if a taller wave is forecast.
        desc: isAboveTsunamiLine(floor)
          ? (language === 'English' ? `You are on ${describeFloor(floor)}, at or above the ${TSUNAMI_MIN_SAFE_FLOOR}th-floor minimum. Stay put unless a taller wave is forecast, then go higher.` : language === 'Chinese' ? `您位于${floor}楼，已达到4层最低标准。除预报浪高更大外请留在原地，否则继续向上。` : language === 'Vietnamese' ? `Bạn đang ở tầng ${floor}, đạt mức tối thiểu tầng 4. Hãy ở lại trừ khi dự báo sóng cao hơn, khi đó hãy lên cao hơn.` : `現在${floor}階、最低基準の4階以上です。より高い波の予報がなければ留まり、あれば更に上階へ。`)
          : (language === 'English' ? `${describeFloor(floor)} is inside the inundation zone. Climb to the ${TSUNAMI_MIN_SAFE_FLOOR}th floor or higher in the nearest strong structure.` : language === 'Chinese' ? "当前楼层处于淹没范围内。请立即爬到附近坚固建筑的4层或以上。" : language === 'Vietnamese' ? "Tầng hiện tại nằm trong vùng ngập. Di chuyển lên tầng 4 hoặc cao hơn của tòa nhà kiên cố." : "現在の階は浸水想定区域内です。頑丈なビルの4階以上に上ってください。")
      },
      {
        num: "3",
        title: language === 'English' ? "Do NOT Drive or Use Elevators" : language === 'Chinese' ? "切勿驾车或乘电梯" : language === 'Vietnamese' ? "KHÔNG tự lái xe hay dùng thang máy" : "運転およびエレベーター禁止",
        desc: language === 'English' ? "Road gridlock and power outages imminent. Evacuate on foot." : language === 'Chinese' ? "交通瘫痪及停电迫在眉睫。请徒步避难。" : language === 'Vietnamese' ? "Giao thông dễ tắc nghẽn & mất điện diện rộng. Đi bộ thoát hiểm." : "渋滞と停電の恐れ。徒歩での避難を徹底してください。"
      }
    ];
  }

  // Newer hazard classes (flood, landslide, volcano, wildfire, …) have no
  // hand-written multilingual copy. Gemini localises the live path; this
  // deterministic fallback is English only, and says what it is rather than
  // reusing tsunami advice — which is what the old three-way branch did.
  const info = hazardInfo(activeHazard);
  const shelter = getShelterInfo(userPos, dynamicMarkers);

  if (info.response === 'shelter_in_place') {
    return [
      { num: '1', title: 'Stay inside — do not evacuate', desc: info.rationale },
      { num: '2', title: 'Move away from windows and glass', desc: 'Use an inner room or hallway with no exterior glazing.' },
      { num: '3', title: 'Keep alerts on', desc: 'You will be told if conditions make moving necessary.' }
    ];
  }

  if (info.response === 'monitor') {
    return [
      { num: '1', title: `${info.label} reported nearby`, desc: info.rationale },
      { num: '2', title: 'No evacuation required', desc: 'This is a slow-onset hazard. Follow local authority guidance.' },
      { num: '3', title: 'Stay informed', desc: 'Keep alerts enabled in case the situation escalates.' }
    ];
  }

  return [
    { num: '1', title: `${info.label} — act now`, desc: info.rationale },
    { num: '2', title: mobility === 'Wheelchair User' ? 'Use step-free exits' : 'Take stairs, not the elevator',
      desc: groupSlowsYou(companions) ? 'Keep your group together and move at the slowest person\u2019s pace.' : companions.count > 0 ? 'Keep your group together.' : 'Move without delay.' },
    { num: '3', title: `Move to ${shelter.name} (${shelter.distance})`, desc: 'Follow the highlighted route on the map.' }
  ];
}
