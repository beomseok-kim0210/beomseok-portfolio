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
  src: "/videos/hangarae-portfolio-full.mp4",
  fallbackSrc: "/videos/행가래_video_fortpolio.mp4",
  caption: "Full case film · 1m 40s",
  detailCaption:
    "MCP Asset Pipeline · Correct/Incorrect Posture · 3D Pinpoint · Realtime Feedback",
} as const;

export const hangaraeOverviewCards = [
  {
    id: "trouble-01",
    label: "01 Asset Pipeline",
    title: "Claude Code + MCP + Blender + Unity로 GLB 자산 흐름을 만들었습니다.",
    summary: "핵심은 자산이 아니라 프론트엔드에서 바로 쓰는 형태로 만드는 파이프라인이었습니다.",
  },
  {
    id: "trouble-02",
    label: "02 Correct Feedback",
    title: "정확한 상체와 하체 자세를 즉시 성공 피드백으로 연결했습니다.",
    summary: "올바른 움직임을 게임의 성공 조건으로 바꾸는 기준이 필요했습니다.",
  },
  {
    id: "trouble-03",
    label: "03 Incorrect Feedback",
    title: "잘못된 움직임은 별도 실패 조건과 교정 UX로 분리했습니다.",
    summary: "움직였다는 사실만으로는 충분하지 않았고 잘못된 움직임을 바로 끊어야 했습니다.",
  },
  {
    id: "trouble-04",
    label: "04 Pinpoint Asset",
    title: "캐릭터 대신 관절과 좌표를 보여주는 3D 시각화가 필요했습니다.",
    summary: "행가래의 데이터는 캐릭터 애니메이션이 아니라 keypoint 좌표 변화였습니다.",
  },
  {
    id: "trouble-05",
    label: "05 Coordinate Pipeline",
    title: "18개 keypoint의 x, y, z 좌표를 실시간 상태로 안정화해야 했습니다.",
    summary: "좌표 수집보다 좌표를 UI가 버틸 수 있는 상태로 바꾸는 것이 중요했습니다.",
  },
  {
    id: "trouble-06",
    label: "06 Threshold Tuning",
    title: "운동별 임계값은 코드가 아니라 반복 테스트로 찾아야 했습니다.",
    summary: "정답 하나가 아니라 운동별로 다른 기준을 조정하는 과정이 필요했습니다.",
  },
] as const;

export type HangaraeTrouble = {
  id: string;
  label: string;
  title: string;
  diagnosis: string;
  problem: string;
  cause: string;
  decision: string;
  result: string;
  metricTitle: string;
  metricBody: string;
  tech: string[];
  visualType:
    | "asset-pipeline"
    | "correct-feedback"
    | "incorrect-feedback"
    | "pinpoint-visual"
    | "coordinate-pipeline"
    | "threshold-tuning";
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
    label: "TROUBLE 01 · ASSET PIPELINE",
    title: "게임에 필요한 3D 자산은 직접 만들어야 했습니다.",
    diagnosis:
      "문제는 자산이 없다는 것이 아니라 프론트엔드에서 바로 쓸 수 있는 형태로 정리하는 일이었습니다.",
    problem:
      "기성 에셋만으로는 재활 게임의 상호작용과 피드백 구조를 프로젝트 톤에 맞게 구성하기 어려웠습니다.",
    cause:
      "Blender와 Unity에서 만든 결과물이 그대로는 프론트엔드에 붙지 않았고 GLB 구조와 export 기준이 필요했습니다.",
    decision:
      "Claude Code, MCP, Blender, Unity를 연결해 자산 제작과 수정 과정을 반복 가능한 파이프라인으로 바꿨습니다.",
    result:
      "Three.js에서 바로 불러 쓸 수 있는 GLB 중심 자산 파이프라인을 확보했습니다.",
    metricTitle: "GLB Asset Pipeline",
    metricBody: "Claude Code -> MCP -> Blender / Unity -> GLB Export -> Three.js",
    tech: ["Claude Code", "MCP", "Blender", "Unity", "GLB", "Three.js"],
    visualType: "asset-pipeline",
    imageSrc: "/images/mcp-blender-unity-pipeline.png",
    secondaryImageSrc: "/images/glb-threejs-webrtc-ui.png",
    fallbackImageSrc: "/images/mcp-blender-pipeline.png",
  },
  {
    id: "trouble-02",
    label: "TROUBLE 02 · CORRECT FEEDBACK",
    title: "정확한 자세를 정확한 성공 피드백으로 연결해야 했습니다.",
    diagnosis:
      "사용자가 올바르게 움직였을 때는 지연 없이 긍정 피드백이 나와야 학습 루프가 유지됩니다.",
    problem:
      "센서 데이터가 들어온다고 바로 성공이 아니었고 올바른 상체와 하체 움직임만 성공 조건으로 묶어야 했습니다.",
    cause:
      "상체 운동과 하체 운동은 관절 기준이 달라 같은 룰로 처리하면 잘못된 성공 판정이 섞였습니다.",
    decision:
      "상체와 하체의 정자세 자료를 분리하고 운동별 임계값을 통과했을 때만 성공 애니메이션과 효과를 실행했습니다.",
    result:
      "정확한 자세는 즉시 성공 상태로 전환되고 긍정 피드백이 끊기지 않게 연결됐습니다.",
    metricTitle: "Success Feedback Chain",
    metricBody: "Coordinate -> Joint Angle -> Threshold Pass -> Success Animation -> Positive Feedback",
    tech: ["Threshold Logic", "Joint Angle", "Feedback UI", "Animation", "Sound Effect"],
    visualType: "correct-feedback",
    videoSrc: "/images/%EC%83%81%EC%B2%B4_collect.gif",
    secondaryVideoSrc: "/images/%ED%95%98%EC%B2%B4_collect.gif",
  },
  {
    id: "trouble-03",
    label: "TROUBLE 03 · INCORRECT FEEDBACK",
    title: "부정확한 자세는 즉시 교정 피드백으로 분리해야 했습니다.",
    diagnosis:
      "재활 피드백의 중심은 성공 연출보다 잘못된 움직임을 바로 잡아주는 UX에 있었습니다.",
    problem:
      "움직임이 발생했다는 사실만으로는 올바른 수행인지 판정할 수 없어서 교정 안내가 필요했습니다.",
    cause:
      "잘못된 자세가 입력으로만 소비되면 사용자는 같은 실수를 반복하고 화면은 이를 구분하지 못했습니다.",
    decision:
      "상체와 하체의 오자세 기준을 따로 두고 임계값 미달 또는 초과 조건을 실패 흐름으로 나눴습니다.",
    result:
      "부정확한 움직임은 성공과 별도 경로로 빠져 즉시 교정 메시지와 재시도 피드백을 받게 됐습니다.",
    metricTitle: "Correction Feedback Chain",
    metricBody: "Coordinate -> Joint Angle -> Threshold Fail -> Correction Message -> Retry Feedback",
    tech: ["Threshold Fail", "Correction UX", "Realtime Evaluation", "Pose Feedback"],
    visualType: "incorrect-feedback",
    videoSrc: "/images/%EC%83%81%EC%B2%B4%ED%8B%80%EB%A6%BC.gif",
    secondaryVideoSrc: "/images/%ED%95%98%EC%B2%B4%ED%8B%80%EB%A6%BC.gif",
  },
  {
    id: "trouble-04",
    label: "TROUBLE 04 · 3D PINPOINT ASSET",
    title: "캐릭터보다 좌표를 보여주는 3D 핀포인트 시각화가 필요했습니다.",
    diagnosis:
      "재활 피드백에서 중요한 것은 예쁜 캐릭터가 아니라 어느 관절과 어느 좌표가 반응하는지 즉시 이해시키는 시각화였습니다.",
    problem:
      "일반 캐릭터형 아바타는 사용자가 어떤 관절 움직임이 바뀌었는지 해석하기 어렵게 만들 수 있었습니다.",
    cause:
      "행가래의 핵심 데이터는 18개 keypoint의 좌표 변화였고 이 데이터는 skeleton 기반 시각화가 더 직관적이었습니다.",
    decision:
      "캐릭터형 아바타 대신 3D pinpoint, skeleton line, joint focus를 중심으로 시각 피드백 구조를 재설계했습니다.",
    result:
      "사용자는 움직임의 외형보다 어떤 좌표와 관절이 반응하는지 더 직접적으로 확인할 수 있게 됐습니다.",
    metricTitle: "Coordinate-to-Visual Sync",
    metricBody: "18 Keypoints -> 3D Pinpoint -> Skeleton Line -> Motion Feedback",
    tech: ["Three.js", "3D Point", "Skeleton Line", "GLB", "Coordinate Mapping"],
    visualType: "pinpoint-visual",
    imageSrc: "/images/3d-pinpoint-asset.png",
    videoSrc: "/videos/skeleton.mp4",
    fallbackImageSrc: "/images/glb-threejs-webrtc-ui.png",
  },
  {
    id: "trouble-05",
    label: "TROUBLE 05 · REALTIME COORDINATE PIPELINE",
    title: "실시간 좌표를 그대로는 UI로 연결할 수 없었습니다.",
    diagnosis:
      "문제는 좌표 수집이 아니라 좌표를 안정적인 화면 상태로 변환하는 프론트엔드 파이프라인이었습니다.",
    problem:
      "18개 keypoint의 x, y, z 좌표가 연속으로 들어오면 UI, 애니메이션, 피드백 상태가 동시에 흔들릴 수 있었습니다.",
    cause:
      "한 프레임마다 54개의 좌표 값이 생성됐고 이를 그대로 화면 상태와 결합하면 반응성이 오히려 불안정해졌습니다.",
    decision:
      "Jetson Nano, YOLO, Redis, 프론트엔드 상태를 단계별로 분리해 필요한 값만 UI와 Three.js에 반영했습니다.",
    result:
      "좌표 입력과 시각 피드백의 리듬을 분리하면서도 실시간성은 유지하는 구조를 만들었습니다.",
    metricTitle: "Realtime Coordinate Stream",
    metricBody: "18 keypoints · 54 coordinate values per frame · Redis-backed state flow",
    tech: ["Jetson Nano", "Depth Camera", "YOLO", "Redis", "Three.js", "Realtime State"],
    visualType: "coordinate-pipeline",
  },
  {
    id: "trouble-06",
    label: "TROUBLE 06 · THRESHOLD TUNING",
    title: "임계값은 코드가 아니라 반복 실험으로 찾아야 했습니다.",
    diagnosis:
      "정확한 자세와 부정확한 자세를 나누는 기준은 한 번에 정해지지 않았고 운동별 테스트가 필요했습니다.",
    problem:
      "운동마다 움직임 범위가 다르고 상체와 하체의 관절 기준도 달라 단일 임계값으로는 판정이 흔들렸습니다.",
    cause:
      "관절 각도, 좌표 변화량, 수행 속도 모두가 운동별로 달라서 같은 기준을 재사용하기 어려웠습니다.",
    decision:
      "운동별로 10회 이상 trial을 반복하고 전체 200회 이상 테스트하면서 임계값을 지속적으로 조정했습니다.",
    result:
      "운동별 기준을 가진 피드백 엔진이 생기면서 정확한 자세와 교정이 필요한 자세를 분리할 수 있었습니다.",
    metricTitle: "Threshold Tuning",
    metricBody: "200+ tuning tests · 10 trials per exercise · exercise-specific threshold",
    tech: ["Joint Angle", "Threshold Logic", "Exercise Rule", "Feedback Decision"],
    visualType: "threshold-tuning",
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
