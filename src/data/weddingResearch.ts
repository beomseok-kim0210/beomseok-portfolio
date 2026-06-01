export type WeddingTimelineItem = {
  model: string;
  type: string;
  coreAssumption: string;
  whyTried: string;
  result: string;
  reason: string;
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
};

export const weddingHeroChips = [
  "2D → 3D",
  "Human Reconstruction",
  "Model Evaluation",
  "Product Decision",
  "Prompt Engineering",
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

export const weddingVisualAnalysis = {
  imageSrc: "/images/wedding-3d-econ-comparison.png",
  imageAlt:
    "ECON experiment comparison showing a mermaid line dress reconstructed successfully and a volumetric wedding dress failing to preserve volume.",
  caption:
    "ECON 실험 결과. 머메이드 라인처럼 몸에 밀착된 드레스는 인체 표면과 의상을 하나의 geometry로 해석할 수 있었지만, 볼가운처럼 몸에서 떨어져 부피를 형성하는 드레스는 내부 빈 공간과 스커트 실루엣을 안정적으로 유지하지 못했습니다.",
  successTitle: "왜 성공했는가",
  successBody:
    "머메이드 라인 드레스는 신체 표면을 따라 실루엣이 형성됩니다. 모델 입장에서는 인체 표면과 의상 표면 사이의 거리가 작기 때문에, 이를 하나의 clothed human surface로 복원하기 쉽습니다.",
  failureTitle: "왜 실패했는가",
  failureBody:
    "볼가운 드레스는 신체와 스커트 사이에 큰 빈 공간이 존재합니다. 단일 이미지 기반 모델은 보이지 않는 내부 공간과 후면 볼륨을 추론해야 하는데, 이 과정에서 스커트 부피가 인체 메쉬 쪽으로 붕괴하거나 잘려 나갔습니다.",
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
    "약 4개월 동안 2D → 3D 변환을 검토했지만, 대형 웨딩드레스의 부피감과 레이어 구조를 안정적으로 표현하지 못했습니다.",
  insight:
    '사용자가 실제로 원한 것은 "3D 모델 자체"가 아니라 "나에게 어울리는 드레스를 더 확신 있게 고르는 경험"이라고 판단했습니다.',
  therefore:
    "3D 복원 중심에서 추천 기준 설계와 비교 경험 중심으로 프로젝트 방향을 전환했습니다.",
};

export const weddingExperts: WeddingExpert[] = [
  { title: "Body Expert", description: "체형과 실루엣 적합성 분석" },
  { title: "Color Expert", description: "피부톤과 드레스 색상 조합 분석" },
  { title: "Design Expert", description: "드레스 라인, 소재, 패턴 분석" },
  { title: "Accessory Expert", description: "부케, 베일, 장신구 조합 분석" },
  { title: "Style Expert", description: "전체 스타일링 일관성 검토" },
];

export const weddingPromptProcess = [
  "User Input",
  "Expert Analysis",
  "Structured Markdown Notes",
  "Prompt Refinement",
  "Final Recommendation",
];

export const weddingPromptMethods = [
  "Few-shot Prompting",
  "Role-based Prompting",
  "Chain-of-Thought",
  "Markdown-based Prompt Library",
  "Research-informed Prompt Design",
];

export const weddingReflection = [
  "처음에는 어떻게든 3D 웨딩드레스를 구현하는 것이 목표였습니다. 하지만 SMPL, PIFuHD, ICON, ECON을 검토하면서 문제는 모델을 더 많이 찾는 것이 아니라, 웨딩드레스라는 데이터가 기존 Human Reconstruction 모델이 가정한 환경과 다르다는 점임을 확인했습니다.",
  "이 경험을 통해 기술을 끝까지 고집하는 것보다 기술의 한계를 분석하고, 사용자 가치에 맞게 방향을 전환하는 의사결정이 더 중요하다는 것을 배웠습니다.",
  "이후 SSAFY 행가래 프로젝트에서 3D 애니메이션과 게임형 피드백을 설계할 때도, 이 경험이 기술 선택과 구현 범위 판단의 기준이 되었습니다.",
];
