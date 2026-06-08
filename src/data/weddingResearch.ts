export type WeddingStat = {
  value: string;
  label: string;
  caption: string[];
};

export type WeddingEvaluationAxis = {
  step: string;
  title: string;
  description: string;
};

export type WeddingTimelineItem = {
  model: string;
  type: string;
  coreAssumption: string;
  whyTried: string;
  result: string;
  reason: string;
  outcome: string;
};

export type WeddingComparisonRow = {
  model: string;
  year: string;
  representation: string;
  bodyPrior: string;
  publishedMetric: string;
  volumetricDressFit: string;
  portfolioDecision: string;
};

export type WeddingFailureRow = {
  model: string;
  bodyPrior: number;
  topologyFlexibility: number;
  occlusionRobustness: number;
  volumetricGarment: number;
  environmentReproducibility: number;
  failureSummary: string;
};

export type WeddingExpert = {
  title: string;
  description: string;
  fileName: string;
};

export type WeddingEnvironmentStep = {
  step: string;
  title: string;
};

export const weddingHeroChips = [
  "2D → 3D",
  "Human Reconstruction",
  "Model Evaluation",
  "Product Decision",
  "Prompt Engineering",
];

export const weddingResearchStats: WeddingStat[] = [
  {
    value: "4",
    label: "Models Evaluated",
    caption: ["SMPL", "PIFuHD", "ICON", "ECON"],
  },
  {
    value: "3 Weeks",
    label: "Research Period",
    caption: ["2D → 3D", "Reconstruction Study"],
  },
  {
    value: "10+",
    label: "Environment Builds",
    caption: ["Conda", "CUDA", "PyTorch", "PyTorch3D"],
  },
  {
    value: "30+",
    label: "Research References",
    caption: ["Papers", "Github Repositories", "Technical Reports"],
  },
  {
    value: "100+",
    label: "Generated Samples",
    caption: ["Human Reconstruction Tests"],
  },
];

export const weddingEvaluationAxes: WeddingEvaluationAxis[] = [
  {
    step: "01",
    title: "Body Prior",
    description: "인체 구조 반영 능력",
  },
  {
    step: "02",
    title: "Clothing Representation",
    description: "의상 표현 능력",
  },
  {
    step: "03",
    title: "Volume Preservation",
    description: "부피 유지 능력",
  },
  {
    step: "04",
    title: "Environment Reproducibility",
    description: "환경 재현 가능성",
  },
  {
    step: "05",
    title: "Production Feasibility",
    description: "서비스 적용 가능성",
  },
];

export const weddingResearchQuestion = [
  "처음에는 사용자가 단순히 추천 이미지를 보는 것이 아니라, 자신의 체형이 반영된 3D 결과를 확인할 수 있다면 추천 결과에 대한 신뢰도가 더 높아질 것이라고 판단했습니다.",
  "정면 이미지로는 확인하기 어려운 옆면, 후면, 드레스 실루엣까지 보여주기 위해 2D 이미지를 3D로 변환하는 방식을 검토했습니다.",
  '하지만 실험이 진행될수록 문제는 단순한 3D 복원이 아니라, "몸에 붙은 의상"과 "몸에서 떨어진 의상"을 모델이 구분할 수 있는가로 바뀌었습니다.',
];

export const weddingTimeline: WeddingTimelineItem[] = [
  {
    model: "SMPL",
    type: "Parametric Body Model",
    coreAssumption:
      "사람의 몸은 고정된 인체 템플릿을 기반으로 변형할 수 있다.",
    whyTried:
      "사용자의 신체 사이즈를 추정하고, 그 위에 드레스를 입히는 구조를 만들기 위해 시도했다.",
    result: "Rejected",
    reason:
      "옷의 부피와 레이어 구조를 표현할 수 없고, 신체 수치를 반영해도 기본 템플릿에서 크게 벗어나지 못했다.",
    outcome:
      "사용자 체형을 수치로 반영하는 것은 가능했지만 의상 자체를 표현하는 모델은 아니었다.",
  },
  {
    model: "PIFuHD",
    type: "Pixel-Aligned Implicit Function",
    coreAssumption:
      "단일 RGB 이미지에서 픽셀 정렬 특징을 기반으로 3D 표면을 복원할 수 있다.",
    whyTried:
      "사용자 신체 위에 드레스를 입히는 대신, 드레스를 입은 이미지 자체를 3D화하기 위해 시도했다.",
    result: "Rejected",
    reason:
      "얼굴, 손, 부케 등 세부 요소 복원이 불안정했고, 드레스 가장자리와 메쉬가 찢어지거나 누락되는 문제가 발생했다.",
    outcome:
      "드레스 이미지를 3D로 만드는 방향은 가능했지만 메쉬 품질과 세부 구조 안정성이 부족했다.",
  },
  {
    model: "ICON",
    type: "Normal-Guided Clothed Human Reconstruction",
    coreAssumption:
      "SMPL-X 기반 인체 prior와 normal map을 함께 사용하면 옷을 입은 사람의 표면을 더 안정적으로 복원할 수 있다.",
    whyTried:
      "PIFuHD보다 인체 구조와 의상 표면을 더 안정적으로 결합할 수 있을 것으로 판단했다.",
    result: "Environment Failed / Rejected",
    reason:
      "PyTorch, CUDA, PyTorch3D, conda 환경 의존성이 높았고, 실험 환경과 공개 코드의 버전 충돌로 안정적인 재현이 어려웠다.",
    outcome:
      "구조적으로 가장 기대했던 모델이었지만 환경 의존성이 매우 높았다.",
  },
  {
    model: "ECON",
    type: "Explicit Clothed Human Reconstruction",
    coreAssumption:
      "SMPL-X와 전면/후면 normal을 결합하면 옷을 입은 사람의 표면을 더 정교하게 복원할 수 있다.",
    whyTried:
      "PIFuHD, ICON보다 loose clothing과 clothed human reconstruction에 더 적합하다고 판단했다.",
    result: "Partial Success",
    reason:
      "몸에 달라붙는 머메이드 라인 드레스는 비교적 잘 복원했지만, 부피가 큰 볼가운 드레스는 내부 공간과 스커트 볼륨을 유지하지 못했다.",
    outcome:
      "가장 좋은 결과를 보여줬지만 웨딩드레스의 핵심인 볼륨 구조를 완전히 복원하지 못했다.",
  },
];

export const weddingComparisonRows: WeddingComparisonRow[] = [
  {
    model: "SMPL",
    year: "2015",
    representation: "Parametric body mesh",
    bodyPrior: "Very High",
    publishedMetric: "N/A",
    volumetricDressFit: "1/5",
    portfolioDecision: "의상 부피 표현 불가로 중단",
  },
  {
    model: "PIFuHD",
    year: "2020",
    representation: "Implicit surface from RGB",
    bodyPrior: "Low",
    publishedMetric: "CAPE Chamfer ≈ 3.237cm",
    volumetricDressFit: "2/5",
    portfolioDecision: "메쉬 누락과 세부 요소 불안정으로 중단",
  },
  {
    model: "PaMIR",
    year: "2020",
    representation: "RGB + SMPL conditioned implicit surface",
    bodyPrior: "Medium-High",
    publishedMetric: "CAPE Chamfer ≈ 2.122cm",
    volumetricDressFit: "2/5",
    portfolioDecision: "SMPL 의존성으로 드레스 볼륨 과소 표현",
  },
  {
    model: "ICON",
    year: "2022",
    representation: "SMPL-X normal guided implicit surface",
    bodyPrior: "High",
    publishedMetric: "CAPE Chamfer ≈ 1.142cm",
    volumetricDressFit: "2/5",
    portfolioDecision: "환경 재현 실패 및 대형 드레스 부피 한계로 중단",
  },
  {
    model: "ECON",
    year: "2023",
    representation: "Explicit clothed human reconstruction",
    bodyPrior: "High",
    publishedMetric: "CAPE Chamfer ≈ 0.926cm / RenderPeople ≈ 1.342cm",
    volumetricDressFit: "3/5",
    portfolioDecision: "부분 성공했으나 대형 드레스 부피 구현 실패로 중단",
  },
];

export const weddingComparisonNote =
  "아래 수치는 각 모델 논문 및 공개 벤치마크에서 제시된 참고 지표이며, 본 프로젝트의 웨딩드레스 실험 결과를 직접 측정한 값은 아닙니다. 실험에서는 해당 모델들의 구조적 한계와 적용 가능성을 중심으로 비교했습니다.";

export const weddingResearchInsight = {
  leftTitle: "Human Reconstruction",
  leftBody: "사람의 형태 복원",
  rightTitle: "Garment Reconstruction",
  rightBody: "의상의 형태 복원",
  comparisons: [
    { label: "Body Shape", result: "pass" as const },
    { label: "Loose Skirt", result: "fail" as const },
    { label: "Wedding Volume", result: "fail" as const },
    { label: "Layer Structure", result: "fail" as const },
  ],
  mainInsight:
    "대부분의 모델은 Human Reconstruction 문제를 해결하기 위해 만들어졌다. 그러나 웨딩드레스는 Garment Reconstruction 문제에 가깝다.",
  conclusion:
    "즉 우리가 실패한 이유는 모델 성능이 부족해서가 아니라, 문제 정의와 모델의 가정이 달랐기 때문이다.",
};

export const weddingEnvironmentSteps: WeddingEnvironmentStep[] = [
  { step: "01", title: "Github Repository 분석" },
  { step: "02", title: "Colab 실행" },
  { step: "03", title: "Conda 환경 구성" },
  { step: "04", title: "CUDA 버전 충돌" },
  { step: "05", title: "PyTorch 버전 충돌" },
  { step: "06", title: "PyTorch3D 의존성 충돌" },
  { step: "07", title: "재설치" },
  { step: "08", title: "환경 재구축" },
];

export const weddingEnvironmentSummary = [
  "ICON 계열 모델은 PyTorch, CUDA, PyTorch3D, Conda 환경에 강하게 의존했다.",
  "실제 구현 과정에서는 모델 성능보다 실행 환경을 재현하는 데 더 많은 시간이 소요되었다.",
];

export const weddingVisualAnalysis = {
  imageSrc: "/images/wedding-3d-econ-comparison.png",
  imageAlt:
    "ECON experiment comparison showing a mermaid line dress reconstructed successfully and a volumetric wedding dress failing to preserve volume.",
  failureImageSrc: "/images/wedding-econ-failure-board.png",
  failureImageAlt:
    "ECON failure board showing successful mermaid reconstruction and failed volumetric wedding dress reconstruction.",
  caption:
    "ECON 실험 결과. 머메이드 라인처럼 몸에 밀착된 드레스는 인체 표면과 의상을 하나의 geometry로 해석할 수 있었지만, 볼가운처럼 몸에서 떨어져 부피를 형성하는 드레스는 내부 빈 공간과 스커트 실루엣을 안정적으로 유지하지 못했습니다.",
  successTitle: "Mermaid Line Dress",
  successMetricLabel: "Body Surface Distance",
  successMetricValue: "Low",
  successResult: "Stable Reconstruction",
  failureTitle: "Ball Gown Dress",
  failureMetricLabel: "Body Surface Distance",
  failureMetricValue: "High",
  failureResult: "Volume Collapse",
  explanation:
    "머메이드 라인은 신체와 의상의 거리가 짧다. 반면 볼가운은 몸과 스커트 사이에 큰 빈 공간이 존재한다. 단일 이미지 기반 모델은 이 내부 공간을 관측할 수 없다. 따라서 스커트 부피가 인체 쪽으로 붕괴한다.",
};

export const weddingFailureRows: WeddingFailureRow[] = [
  {
    model: "SMPL",
    bodyPrior: 5,
    topologyFlexibility: 1,
    occlusionRobustness: 1,
    volumetricGarment: 1,
    environmentReproducibility: 5,
    failureSummary:
      "인체 템플릿은 안정적이지만 의상 부피와 레이어 구조를 표현할 수 없음.",
  },
  {
    model: "PIFuHD",
    bodyPrior: 2,
    topologyFlexibility: 4,
    occlusionRobustness: 2,
    volumetricGarment: 2,
    environmentReproducibility: 3,
    failureSummary:
      "자유로운 표면 복원은 가능하지만 단일 이미지 기반이라 후면과 내부 공간 추론이 불안정함.",
  },
  {
    model: "ICON",
    bodyPrior: 4,
    topologyFlexibility: 3,
    occlusionRobustness: 3,
    volumetricGarment: 2,
    environmentReproducibility: 2,
    failureSummary:
      "인체 prior와 normal map으로 안정성은 높지만 환경 의존성과 대형 의상 복원 한계가 존재함.",
  },
  {
    model: "ECON",
    bodyPrior: 4,
    topologyFlexibility: 4,
    occlusionRobustness: 3,
    volumetricGarment: 3,
    environmentReproducibility: 3,
    failureSummary:
      "가장 좋은 결과를 보였지만 몸에서 크게 떨어진 드레스 부피와 후면 볼륨은 안정적으로 복원하지 못함.",
  },
];

export const weddingPivot = {
  originalGoal: "2D → 3D 웨딩드레스 가상 피팅",
  finalDirection: "AI 기반 웨딩드레스 추천 및 비교 경험",
  reason:
    "약 3주 동안 2D → 3D 변환을 검토했지만, 대형 웨딩드레스의 부피감과 레이어 구조를 안정적으로 표현하지 못했습니다.",
  insight:
    '사용자가 실제로 원한 것은 "3D 모델 자체"가 아니라 "나에게 어울리는 드레스를 더 확신 있게 고르는 경험"이라고 판단했습니다.',
  therefore:
    "3D 복원 중심에서 추천 기준 설계와 비교 경험 중심으로 프로젝트 방향을 전환했습니다.",
};

export const weddingExperts: WeddingExpert[] = [
  {
    title: "Body Expert",
    description: "체형과 실루엣 적합성 분석",
    fileName: "Body Expert.md",
  },
  {
    title: "Color Expert",
    description: "피부톤과 드레스 색상 조합 분석",
    fileName: "Color Expert.md",
  },
  {
    title: "Design Expert",
    description: "드레스 라인, 소재, 패턴 분석",
    fileName: "Design Expert.md",
  },
  {
    title: "Accessory Expert",
    description: "부케, 베일, 장신구 조합 분석",
    fileName: "Accessory Expert.md",
  },
  {
    title: "Style Expert",
    description: "전체 스타일링 일관성 검토",
    fileName: "Style Expert.md",
  },
];

export const weddingPromptMethods = [
  "Few-shot Prompting",
  "Role-based Prompting",
  "Chain-of-Thought",
  "Markdown-based Prompt Library",
  "Research-informed Prompt Design",
];

export const weddingLearned = {
  title: "실패한 기술보다\n실패를 분석하는 과정이 더 중요했습니다.",
  paragraphs: [
    "처음 목표는 3D 웨딩드레스를 구현하는 것이었습니다. 하지만 연구가 진행될수록 기술 구현 자체보다 기술의 한계를 이해하는 일이 더 중요하다는 것을 알게 되었습니다.",
    'SMPL, PIFuHD, ICON, ECON을 검토하면서 "어떤 모델이 가장 좋은가" 보다 "어떤 모델이 어떤 문제를 해결하도록 설계되었는가"를 먼저 분석해야 한다는 것을 배웠습니다.',
    "이 경험은 이후 SSAFY 행가래 프로젝트에서 3D 애니메이션과 실시간 운동 피드백을 설계할 때 기술 선택의 기준이 되었습니다.",
  ],
  quote: "Technology Validation Before Technology Adoption",
};
