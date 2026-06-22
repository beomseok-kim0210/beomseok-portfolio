import { fullVideoSources } from "@/data/videoSources";

export const hangaraeHero = {
  eyebrow: "Realtime Motion Feedback Case Study",
  title: ["움직임을 데이터로,", "데이터를 피드백으로 바꾸기까지."],
  subtitle:
    "행가래는 재활 동작을 게임처럼 보이게 만드는 프로젝트가 아니라, MCP 기반 자산 제작, 3D 구현, 실시간 좌표 파이프라인, 자세 피드백을 하나의 프론트엔드 흐름으로 연결한 사례입니다.",
  metrics: [
    "18 Keypoints",
    "200+ Tests",
    "Realtime Coordinates",
    "3D Pinpoint",
    "Redis Pipeline",
  ],
} as const;

export const hangaraeDemoFilm = {
  title: "먼저 전체 흐름을 보여드립니다.",
  subtitle:
    "1분 40초 안에 MCP 기반 자산 제작, 3D 구현, 실시간 좌표 연동, 자세 피드백 흐름을 확인할 수 있습니다.",
  src: fullVideoSources.hangarae,
  caption: "Full case film · 1m 40s",
  detailCaption:
    "MCP Asset Pipeline · Correct/Incorrect Posture · 3D Pinpoint · Realtime Feedback",
} as const;

export const hangaraeOverviewCards = [
  {
    id: "trouble-01",
    label: "01 YOLO Retraining",
    title: "발 인식 정확도를 데이터 재학습으로 끌어올렸습니다.",
    summary: "모델을 바꾸기 전에, 문제에 맞는 데이터부터 직접 만들었습니다.",
  },
  {
    id: "trouble-02",
    label: "02 Relative Coordinates",
    title: "체형·거리 차이를 상대 좌표와 관절 각도로 흡수했습니다.",
    summary: "절대 좌표 대신 관절끼리의 관계로 자세를 판정했습니다.",
  },
  {
    id: "trouble-03",
    label: "03 Feedback Timing",
    title: "매 프레임이 아니라 유지된 자세에만 피드백했습니다.",
    summary: "실시간이라고 매 순간 피드백을 주는 게 좋은 UX는 아니었습니다.",
  },
  {
    id: "trouble-04",
    label: "04 Coordinate Mapping",
    title: "센서 좌표를 Three.js 좌표계로 변환하는 계층을 뒀습니다.",
    summary: "센서 좌표와 렌더링 좌표는 목적이 다른 좌표계였습니다.",
  },
  {
    id: "trouble-05",
    label: "05 Realtime Sync",
    title: "모든 좌표가 아니라 최신 좌표만 화면에 반영했습니다.",
    summary: "실시간에서 중요한 건 모든 데이터 처리가 아니라 현재 상태 반영이었습니다.",
  },
  {
    id: "trouble-06",
    label: "06 Asset Pipeline",
    title: "Claude·MCP·Blender로 GLB 자산 파이프라인을 만들었습니다.",
    summary: "핵심은 자산이 아니라 바로 쓰는 형태로 만드는 파이프라인이었습니다.",
  },
] as const;

export type HangaraeTrouble = {
  id: string;
  label: string;
  title: string;
  diagnosis: string;
  problem: string;
  cause: string;
  /** 검토한 방법들. 마지막 항목이 선택된 방법. */
  approaches: string[];
  /** 선택한 방법(내가 한 일) */
  decision: string;
  /** 왜 이 방법을 골랐는지 */
  rationale: string;
  result: string;
  /** 그래서 얻은 인사이트 한 줄 */
  insight: string;
  /** 정량 비교(before → after) — 수치가 있는 트러블만 */
  metrics?: { label: string; before: string; after: string }[];
  tech: string[];
  visualType:
    | "yolo-metrics"
    | "asset-pipeline"
    | "correct-feedback"
    | "incorrect-feedback"
    | "pinpoint-visual"
    | "coordinate-pipeline";
  imageSrc?: string;
  secondaryImageSrc?: string;
  fallbackImageSrc?: string;
  videoSrc?: string;
  fallbackVideoSrc?: string;
  secondaryVideoSrc?: string;
  tertiaryVideoSrc?: string;
};

export const hangaraeTroubles: HangaraeTrouble[] = [
  {
    id: "trouble-01",
    label: "TROUBLE 01 · YOLO RETRAINING",
    title: "보행 판단에 필요한 발 인식 정확도가 낮았습니다.",
    diagnosis: "모델을 바꾸기 전에, 문제에 맞는 데이터부터 만들어야 했습니다.",
    problem:
      "발끝·뒤꿈치까지 인식해 보행을 판단해야 했는데, 기성 데이터로 학습한 모델은 발 인식 정확도가 낮아 판정이 흔들렸습니다.",
    cause:
      "재활 보행 동작에 맞는 발 이미지가 부족했고, 일반 데이터로는 발의 미세한 위치를 안정적으로 잡지 못했습니다.",
    approaches: [
      "기존 모델을 유지하고 confidence threshold만 조정한다",
      "발 데이터를 직접 선별·라벨링해 YOLOv11-M을 재학습한다",
    ],
    decision:
      "발 이미지 66,950장 중 품질 좋은 20,507장을 직접 선별·라벨링하고 YOLOv11-M을 재학습했습니다.",
    rationale:
      "threshold 조정으로는 애초에 발을 못 잡는 문제가 풀리지 않았습니다. 문제 도메인(재활 보행)에 맞는 데이터를 직접 만들어 재학습하는 것이 정확도를 가장 크게 끌어올린다고 판단했습니다.",
    result:
      "재학습 후 발 인식 성능이 큰 폭으로 올라, 보행 판단의 토대가 안정됐습니다.",
    insight:
      "모델을 바꾸기 전에, 문제에 맞는 데이터를 직접 만드는 것이 정확도를 가장 크게 끌어올렸습니다.",
    metrics: [
      { label: "Precision", before: "0.447", after: "0.982" },
      { label: "mAP50", before: "0.872", after: "0.988" },
      { label: "mAP50-95", before: "0.747", after: "0.925" },
    ],
    tech: ["YOLOv11-M", "Data Labeling", "Re-training", "Pose Detection"],
    visualType: "yolo-metrics",
  },
  {
    id: "trouble-02",
    label: "TROUBLE 02 · RELATIVE COORDINATES",
    title: "사람마다 키와 카메라 거리가 달라 좌표 기준이 흔들렸습니다.",
    diagnosis: "절대 좌표가 아니라 관절끼리의 관계로 자세를 봐야 했습니다.",
    problem:
      "손목 y좌표가 일정 값 이상이면 '팔을 들었다'고 보는 절대 좌표 기준은, 키가 크거나 멀리 선 사용자에게 기준이 너무 엄격하거나 느슨했습니다.",
    cause:
      "사용자마다 키·팔 길이·카메라 거리·서 있는 위치가 달라, 같은 동작도 절대 좌표는 다르게 측정됐습니다.",
    approaches: [
      "손목 y좌표 절대값을 기준으로 판정한다",
      "어깨 대비 상대 위치와 어깨-팔꿈치-손목 각도를 기준으로 판정한다",
    ],
    decision:
      "몸통 기준점으로 사용자 중심 좌표계를 만들고, 손목을 어깨 대비 상대 위치로, 동작은 관절 각도로 판정했습니다. 절대 좌표는 보조 조건으로만 썼습니다.",
    rationale:
      "'손목이 화면 어디에 있나'보다 '손목이 어깨보다 위에 있나, 팔 각도가 범위 안인가'가 개인차에 훨씬 강건했기 때문입니다.",
    result:
      "체형 차이에 따른 판정 편차가 줄고, 같은 동작을 누가 해도 일관되게 판단할 수 있었습니다.",
    insight:
      "자세 판정은 '화면 어디에 있나'가 아니라 '관절끼리 어떤 관계인가'로 봐야 합니다.",
    tech: ["Relative Coordinates", "Joint Angle", "Body-centered Frame", "Pose Logic"],
    visualType: "correct-feedback",
    videoSrc: "/images/%EC%83%81%EC%B2%B4_collect.gif",
    secondaryVideoSrc: "/images/%ED%95%98%EC%B2%B4_collect.gif",
  },
  {
    id: "trouble-03",
    label: "TROUBLE 03 · FEEDBACK TIMING",
    title: "프레임마다 판정하니 피드백이 과하게 쏟아졌습니다.",
    diagnosis: "실시간이라고 매 순간 피드백을 주는 게 좋은 UX는 아니었습니다.",
    problem:
      "팔을 올리는 중인데 아직 목표에 도달하지 않았다고 '더 올리세요'가 반복 출력되면, 사용자는 시스템이 자신을 이해하지 못한다고 느꼈습니다.",
    cause:
      "판정 단위가 프레임이라, 동작 중간 과정과 좌표 노이즈가 곧바로 피드백 깜빡임으로 이어졌습니다.",
    approaches: [
      "매 프레임 판정 결과를 즉시 피드백한다",
      "일정 시간 이상 같은 상태가 유지될 때만 피드백하고 완충 구간을 둔다",
    ],
    decision:
      "단일 프레임으로 바로 피드백하지 않고, 같은 오류가 일정 프레임 이상 유지될 때만 출력했습니다. 동작 중간 단계와 최종 자세를 구분하고 메시지 반복도 제한했습니다.",
    rationale:
      "재활 피드백은 매 프레임 바뀌는 값이 아니라 동작이 일정 시간 유지됐을 때 의미가 있었습니다. 실시간성보다 '납득 가능성'이 신뢰를 만든다고 봤습니다.",
    result:
      "동작 전환 중 생기는 일시적 불일치는 무시되고, 실제로 잘못된 자세를 유지할 때만 피드백이 떠 사용자 경험이 좋아졌습니다.",
    insight: "빠른 피드백보다 '납득 가능한 피드백'이 사용자 신뢰를 만듭니다.",
    tech: ["Temporal Stability", "Hysteresis", "Feedback UX", "State Machine"],
    visualType: "incorrect-feedback",
    videoSrc: "/images/%EC%83%81%EC%B2%B4%ED%8B%80%EB%A6%BC.gif",
    secondaryVideoSrc: "/images/%ED%95%98%EC%B2%B4%ED%8B%80%EB%A6%BC.gif",
  },
  {
    id: "trouble-04",
    label: "TROUBLE 04 · COORDINATE MAPPING",
    title: "센서 좌표를 그대로 쓰니 화면 속 움직임이 어긋났습니다.",
    diagnosis: "센서 좌표와 렌더링 좌표는 목적이 다른 좌표계였습니다.",
    problem:
      "Depth 카메라 좌표를 Three.js에 바로 넣으면 축·스케일·기준점이 달라, 팔을 올렸는데 화면에선 옆으로 가거나 작은 움직임이 과장됐습니다.",
    cause:
      "카메라 좌표계의 축 방향과 Three.js 월드 좌표계가 다르고, 실제 이동량과 캐릭터 스케일도 1:1로 대응되지 않았습니다.",
    approaches: [
      "센서 좌표를 캐릭터 좌표로 그대로 사용한다",
      "축 보정·정규화·스케일·보간을 거치는 변환 계층을 둔다",
    ],
    decision:
      "카메라와 Three.js 좌표축 차이를 맞추고, 사용자·캐릭터 중심으로 정규화한 뒤 화면에 맞는 스케일로 변환하는 계층을 뒀습니다. 급격한 변화는 보간하고 관절 회전은 범위를 제한했습니다.",
    rationale:
      "센서 좌표를 그대로 쓰면 자연스러운 애니메이션이 나오지 않았습니다. 변환 계층을 둬야 실제 움직임과 화면 반응의 괴리를 줄일 수 있었습니다.",
    result:
      "사용자의 실제 움직임과 화면 속 캐릭터 반응의 괴리가 줄고, 재활 동작 정확도 90% 이상을 달성했습니다.",
    insight:
      "센서 데이터 시각화는 정확도뿐 아니라, 사용자가 직관적으로 이해할 표현 방식까지 설계해야 합니다.",
    tech: ["Three.js", "Coordinate Transform", "Normalization", "Interpolation"],
    visualType: "pinpoint-visual",
    imageSrc: "/images/3d-pinpoint-asset.png",
    videoSrc: "/videos/skeleton.mp4",
    fallbackImageSrc: "/images/glb-threejs-webrtc-ui.png",
  },
  {
    id: "trouble-05",
    label: "TROUBLE 05 · REALTIME SYNC",
    title: "좌표를 다 처리하니 화면이 오히려 늦어졌습니다.",
    diagnosis: "실시간에서 중요한 건 '모든 데이터 처리'가 아니라 '현재 상태 반영'이었습니다.",
    problem:
      "Jetson Nano의 좌표 생성 주기와 브라우저 렌더 주기가 달라, 오래된 좌표가 늦게 반영되면 캐릭터가 튀거나 이전 자세가 보였습니다.",
    cause:
      "Redis로 들어오는 좌표를 순서대로 모두 처리하면 실제 동작보다 화면이 뒤처졌고, Three.js는 requestAnimationFrame으로 돌아 수신과 렌더 주기가 어긋났습니다.",
    approaches: [
      "수신한 좌표를 순서대로 모두 렌더링에 반영한다",
      "수신과 렌더를 분리하고, timestamp 기준 최신 좌표만 반영한다",
    ],
    decision:
      "Redis에서 받은 좌표는 최신 상태값으로만 저장하고, Three.js 렌더 루프는 가장 최신 좌표만 참조하게 했습니다. timestamp로 오래된 데이터는 버리고 큰 변화는 보간했습니다.",
    rationale:
      "모든 메시지를 처리하는 것보다 현재 상태를 정확히 보여주는 게 실시간 재활 피드백에선 더 중요했습니다.",
    result:
      "수신 주기와 렌더 주기를 강제로 맞추지 않으면서도, 실시간 좌표를 화면에 안정적으로 반영했습니다.",
    insight:
      "실시간 시스템에서 중요한 건 '모든 메시지 처리'가 아니라 '현재 상태를 정확히 반영하는 구조'입니다.",
    tech: ["Redis", "Latest-state", "Timestamp", "requestAnimationFrame"],
    visualType: "coordinate-pipeline",
  },
  {
    id: "trouble-06",
    label: "TROUBLE 06 · ASSET PIPELINE",
    title: "게임에 필요한 3D 자산을 직접 만들어야 했습니다.",
    diagnosis: "핵심은 자산이 아니라, 프론트엔드에서 바로 쓰는 형태로 만드는 파이프라인이었습니다.",
    problem:
      "기성 에셋만으로는 재활 게임의 상호작용과 노년층 친화적 톤을 맞추기 어려웠고, 만든 결과물이 그대로는 프론트에 붙지 않았습니다.",
    cause:
      "Blender 결과물의 구조·export 기준이 Three.js 렌더링과 맞지 않아, 매번 수작업 변환이 필요했습니다.",
    approaches: [
      "필요할 때마다 에셋을 수작업으로 만들고 변환한다",
      "Claude·MCP·Blender를 연결해 제작·수정을 반복 가능한 파이프라인으로 만든다",
    ],
    decision:
      "Claude를 Blender에 MCP로 연동해 자산 제작·수정을 반복 가능한 흐름으로 만들고, Three.js에서 바로 불러 쓰는 GLB 기준으로 export를 정리했습니다.",
    rationale:
      "한 번 쓰고 버리는 에셋이 아니라, 게임 톤에 맞춰 빠르게 만들고 고칠 수 있는 파이프라인이 필요했기 때문입니다.",
    result:
      "Three.js에서 바로 쓰는 GLB 중심 자산 파이프라인을 확보해, 게임 화면을 빠르게 구성했습니다.",
    insight:
      "도구를 붙이는 것보다, 반복 가능한 제작 파이프라인을 만드는 것이 결과물의 속도를 결정했습니다.",
    tech: ["Claude", "MCP", "Blender", "GLB", "Three.js"],
    visualType: "asset-pipeline",
    imageSrc: "/images/mcp-blender-unity-pipeline.png",
    secondaryImageSrc: "/images/glb-threejs-webrtc-ui.png",
    fallbackImageSrc: "/images/mcp-blender-pipeline.png",
  },
] as const;

export const hangaraeResultMetrics = [
  {
    value: "1m 40s",
    label: "Full Case Film",
    description: "자산 제작부터 실시간 피드백까지 전체 흐름을 하나의 필름으로 정리했습니다.",
  },
  {
    value: "18",
    label: "Tracked Keypoints",
    description: "발끝과 뒤꿈치를 포함한 확장 keypoint 구조로 보행 판단을 구성했습니다.",
  },
  {
    value: "54",
    label: "Coordinate Values per Frame",
    description: "18개 keypoint의 3축 좌표를 프레임 단위 스트림으로 처리했습니다.",
  },
  {
    value: "200+",
    label: "Threshold Tests",
    description: "운동별 임계값을 반복 조정하며 판정 정확도와 체감 UX를 맞췄습니다.",
  },
  {
    value: "GLB",
    label: "Asset Pipeline",
    description: "Blender, Unity, GLB export를 프론트엔드 렌더링 파이프라인에 맞췄습니다.",
  },
  {
    value: "Realtime",
    label: "Redis Coordinate Stream",
    description: "좌표 수집과 화면 상태를 분리해 실시간 피드백 안정성을 확보했습니다.",
  },
] as const;

export const hangaraeResultParagraph =
  "행가래의 핵심은 게임 화면 자체가 아니라, 센서 좌표를 받아 3D 핀포인트와 피드백 상태로 번역하고 정확한 자세와 교정이 필요한 자세를 즉시 구분해 다시 사용자 경험으로 돌려주는 구조를 만든 것입니다.";

export const hangaraeTechGroups = [
  {
    label: "Asset Pipeline",
    items: ["Claude Code", "MCP", "Blender", "Unity", "GLB Export", "Three.js"],
  },
  {
    label: "Pose Feedback",
    items: ["Joint Angle", "Threshold Logic", "Success Feedback", "Correction UX"],
  },
  {
    label: "Realtime Coordinates",
    items: ["Jetson Nano", "Depth Camera", "YOLO Pose", "Redis", "Realtime State"],
  },
  {
    label: "Visual Layer",
    items: ["3D Pinpoint", "Skeleton Line", "Animation", "Sound Effect", "Feedback UI"],
  },
] as const;

export const hangaraeRecap = {
  definition:
    "행가래는 고령자와 편마비 사용자의 재활 동작을 Depth Camera·YOLO로 인식하고, 좌표와 관절 각도를 실시간 게임 피드백으로 바꾸는 AIoT 재활 보조 시스템입니다. 저는 React·Three.js 기반 실시간 피드백 UI와, 자세 데이터를 피드백으로 연결하는 흐름을 맡았습니다.",
  takeaways: [
    {
      label: "Realtime Coordinates",
      note: "프레임당 54개 좌표를 다 쓰지 않고, 최신 값만 화면에 안정적으로 반영했습니다.",
    },
    {
      label: "Threshold Tuning",
      note: "운동별 기준을 코드가 아니라 200번 넘는 반복 테스트로 찾았습니다.",
    },
    {
      label: "Pose Feedback",
      note: "정확한 자세와 교정이 필요한 자세를 즉시 갈라 피드백으로 줬습니다.",
    },
  ],
  reflection: [
    "처음에는 동작을 정확히 인식하고 점수를 매기는 게 핵심이라고 생각했습니다. 그런데 막상 부딪힌 문제들은 인식 정확도보다, 흔들리는 좌표를 어떻게 신뢰할 값으로 정제할지, 사람마다 다른 체형을 어떻게 같은 기준으로 볼지, 매 프레임 바뀌는 판정을 어떻게 납득할 피드백으로 묶을지였습니다.",
    "그래서 절대 좌표 대신 관절 각도와 상대 위치를 쓰고, 최신 좌표만 화면에 반영하고, 일정 시간 유지된 자세에만 피드백을 주는 식으로 '데이터를 사용자가 이해할 피드백으로 번역하는' 데 집중했습니다.",
    "이 프로젝트를 통해 AI 모델이 결과를 잘 내는 것만으로는 사용자의 행동이 바뀌지 않는다는 걸 배웠습니다. 정작 중요한 건 좌표와 각도를 사용자가 바로 자세를 고칠 수 있는 피드백으로 바꾸는 일이었습니다.",
  ],
} as const;
