// 노션 "AI / LLM" 학습 노트 인덱스 (링크 연동용)
// 각 노트는 노션 페이지로 연결됩니다. 방문자가 열람하려면 노션에서 '웹에 공개' 설정이 필요합니다.

export type StudyNote = {
  emoji: string;
  title: string;
  url: string;
};

export type StudyCategory = {
  name: string;
  notes: StudyNote[];
};

const notion = (id: string) => `https://www.notion.so/${id}`;

export const studyCategories: StudyCategory[] = [
  {
    name: "AI 기초·방법론",
    notes: [
      {
        emoji: "🧠",
        title: "AI·ML·DL과 지도학습 기초",
        url: notion("3918c96517988189a11acf13e59cdcc4"),
      },
      {
        emoji: "📉",
        title: "손실함수·정확도·오버피팅",
        url: notion("3918c96517988115bfafd848a1037bf8"),
      },
      {
        emoji: "🧪",
        title: "검증 전략·테스트·교차검증",
        url: notion("3918c965179881c48524f6556e31d0ee"),
      },
      {
        emoji: "🧩",
        title: "비지도학습·클러스터링",
        url: notion("3918c965179881a283b8f7a19699658f"),
      },
    ],
  },
  {
    name: "선형회귀",
    notes: [
      {
        emoji: "📈",
        title: "개념·잔차·최소제곱법",
        url: notion("3918c9651798818e806adaf8e6c2ca1d"),
      },
      {
        emoji: "📊",
        title: "단순선형회귀·계수 해석·모델 적합도",
        url: notion("3918c96517988189a0b5dfb0d26e4787"),
      },
      {
        emoji: "🧮",
        title: "다중선형회귀·행렬 표현·계수 해석",
        url: notion("3918c9651798813b98baf5941b261375"),
      },
      {
        emoji: "⚠️",
        title: "검증·다중공선성·상관과 인과",
        url: notion("3918c9651798816f8553e3cde16e9e91"),
      },
    ],
  },
  {
    name: "NLP",
    notes: [
      {
        emoji: "📝",
        title: "원-핫 인코딩·워드 임베딩",
        url: notion("3918c96517988097afcbd1cdbe4a666d"),
      },
      {
        emoji: "🧠",
        title: "Word2Vec·Skip-gram·CBOW",
        url: notion("3918c96517988060b9f9d14e93bf7745"),
      },
      {
        emoji: "🔁",
        title: "순차 데이터·RNN",
        url: notion("3918c965179880959563df41ec0a57bf"),
      },
      {
        emoji: "🧩",
        title: "LSTM·장기 의존성",
        url: notion("3918c965179880e2bc0cfb9be391d427"),
      },
      {
        emoji: "🌐",
        title: "Encoder-Decoder·신경망 기계번역",
        url: notion("3918c965179880f489d2f5fea1c4e99e"),
      },
      {
        emoji: "🔄",
        title: "Seq2Seq·생성 전략",
        url: notion("3918c96517988162bdd5e5fe858d3c07"),
      },
      {
        emoji: "🎯",
        title: "Attention·Dynamic Context",
        url: notion("3918c96517988157aa3cc2c4d1992ed2"),
      },
      {
        emoji: "🔍",
        title: "Self-Attention·QKV",
        url: notion("3918c96517988103a8beda64c13bd6c9"),
      },
      {
        emoji: "🏗️",
        title: "Transformer",
        url: notion("3918c965179881a195c4d6cda284963d"),
      },
      {
        emoji: "📖",
        title: "사전학습 언어모델",
        url: notion("3918c965179881a09c72e19133a5c4c8"),
      },
      {
        emoji: "📘",
        title: "Encoder 모델·BERT",
        url: notion("3918c9651798810cb42bd832d043b58e"),
      },
      {
        emoji: "🔀",
        title: "Encoder-Decoder·Decoder 모델",
        url: notion("3918c965179881478daef95c29f44e88"),
      },
      {
        emoji: "💬",
        title: "In-Context Learning·Prompting",
        url: notion("3918c9651798814eb8dedf2fd7a44b78"),
      },
    ],
  },
  {
    name: "CNN",
    notes: [
      {
        emoji: "🖼️",
        title: "CNN 모델 기초 (합성곱 레이어)",
        url: notion("3888c96517988187b775c3178b3a2332"),
      },
      {
        emoji: "🧠",
        title: "CNN 기반 모델 변천사 (AlexNet/VGG/ResNet/MobileNet)",
        url: notion("3888c96517988145acf3c08fc5165e78"),
      },
      {
        emoji: "🔄",
        title: "CNN의 한계 + RNN과 LSTM",
        url: notion("3888c965179881da94ecc04292b4384a"),
      },
      {
        emoji: "👁️",
        title: "Vision Transformer (ViT)",
        url: notion("3888c9651798815d939fd8c0aa7f11dc"),
      },
      {
        emoji: "⚙️",
        title: "훈련 전략 1 (활성화 함수·초기화·정규화)",
        url: notion("3888c965179881caa0b0ccfb0513f7d7"),
      },
      {
        emoji: "📉",
        title: "훈련 전략 2 (학습률 스케줄링·하이퍼파라미터)",
        url: notion("3888c965179881858d6be0546a884b4a"),
      },
    ],
  },
  {
    name: "Image FM",
    notes: [
      {
        emoji: "🏛️",
        title: "파운데이션 모델 & CLIP",
        url: notion("3888c96517988132ae73c58b1abadceb"),
      },
      {
        emoji: "👁️",
        title: "VLM 구조·오픈소스 VLM",
        url: notion("3888c96517988164ad40ec8846b6c020"),
      },
      {
        emoji: "🪶",
        title: "sVLM·도메인 VLM·한국어 VLM",
        url: notion("3888c9651798813eac97f3204187559f"),
      },
      {
        emoji: "🎨",
        title: "검출·분할·이미지/비디오/3D 생성",
        url: notion("3908c965179881259a50d5a0fcda5956"),
      },
      {
        emoji: "🧩",
        title: "적응 학습·PEFT·개인화·합성 데이터",
        url: notion("3908c965179881d2b2a3f414334cc2de"),
      },
      {
        emoji: "📱",
        title: "멀티모달 에이전트·도구 사용·모바일 서빙",
        url: notion("3908c965179881669e55f48cecb16927"),
      },
    ],
  },
  {
    name: "LLM",
    notes: [
      {
        emoji: "💬",
        title: "파운데이션·Transformer·대표 LLM",
        url: notion("3888c965179881d2a909d7559254c17d"),
      },
      {
        emoji: "🎯",
        title: "Instruction Tuning·RLHF·DPO",
        url: notion("3888c965179881088da4f08fb80ce311"),
      },
      {
        emoji: "🔍",
        title: "디코딩·프롬프트 엔지니어링",
        url: notion("3888c965179881bcbec8de4bfe2ae316"),
      },
      {
        emoji: "📊",
        title: "평가·벤치마크·LLM-as-Judge",
        url: notion("3888c965179881a58c9bfdb356388334"),
      },
      {
        emoji: "📚",
        title: "멀티모달 LLM·RAG·근거 기반 응답",
        url: notion("3908c965179881fd9850d5f0bdb6b305"),
      },
      {
        emoji: "🛡️",
        title: "할루시네이션·AI 생성 탐지·워터마킹",
        url: notion("3908c965179881b09d5dee16f30ccd18"),
      },
    ],
  },
  {
    name: "Post-Training",
    notes: [
      {
        emoji: "⚙️",
        title: "Pre-training vs Post-training",
        url: notion("3908c96517988107ad10f9f54e0849ed"),
      },
      {
        emoji: "🧬",
        title: "Instruction Tuning 데이터·벤치마크",
        url: notion("3908c9651798815d8b2fd4e26171d999"),
      },
      {
        emoji: "🏆",
        title: "RLHF·선호 데이터·Reward Model",
        url: notion("3908c965179881b48010ed2bf98abe41"),
      },
      {
        emoji: "🔁",
        title: "DPO·RLVR·정렬의 한계",
        url: notion("3908c965179881ebb535c1b2cf2a6cd7"),
      },
    ],
  },
  {
    name: "RAG",
    notes: [
      {
        emoji: "🔎",
        title: "정보 검색·Sparse/Dense Retrieval",
        url: notion("3908c965179881898d35f72e4ea8f8b0"),
      },
      {
        emoji: "📚",
        title: "RAG 아키텍처·평가·실패 대응",
        url: notion("3908c96517988157a87be3f32d86fa4e"),
      },
    ],
  },
  {
    name: "Agent",
    notes: [
      {
        emoji: "🤖",
        title: "LLM Agent·환경 이해·ReAct",
        url: notion("3908c965179881aa8c3de4eccaa209ef"),
      },
      {
        emoji: "🛠️",
        title: "Tool Use·Toolformer·ToolLLM",
        url: notion("3908c965179881f4a57bef68e2a17601"),
      },
      {
        emoji: "🔌",
        title: "MCP(Model Context Protocol)",
        url: notion("3908c965179881a1b924ddcb89334ce3"),
      },
      {
        emoji: "🧭",
        title: "환경·Reasoning·Planning",
        url: notion("3908c96517988193a5bed2571bfe4765"),
      },
      {
        emoji: "🧩",
        title: "LangChain·LangGraph·에이전트 운영",
        url: notion("3908c965179881e9bcddf2b777121ad6"),
      },
    ],
  },
  {
    name: "Efficient AI",
    notes: [
      {
        emoji: "💾",
        title: "수 체계·비트·정수 표현",
        url: notion("3908c965179881c490e0dee348f38cf3"),
      },
      {
        emoji: "🧮",
        title: "고정소수점·부동소수점·IEEE 754",
        url: notion("3908c96517988122a2adf9ae33e09839"),
      },
      {
        emoji: "⚡",
        title: "연산 복잡도·하드웨어·온디바이스 AI",
        url: notion("3908c965179881139303e30a38fe657f"),
      },
      {
        emoji: "🗜️",
        title: "양자화(Quantization)",
        url: notion("3908c965179881d39fa6c264867de12e"),
      },
      {
        emoji: "✂️",
        title: "가지치기·지식 증류",
        url: notion("3908c965179881929dd0f3d6ed43e262"),
      },
      {
        emoji: "🧩",
        title: "PEFT·LoRA·QLoRA",
        url: notion("3908c9651798815fb6e9e2c3219f79d0"),
      },
    ],
  },
  {
    name: "AI Agent",
    notes: [
      {
        emoji: "🧠",
        title: "개념·구성요소·실행 루프",
        url: notion("3908c965179881e68072fb2e4b94a537"),
      },
      {
        emoji: "🧭",
        title: "Multi-Agent 시스템·협업 설계",
        url: notion("3908c9651798810ea009e24456a07de8"),
      },
      {
        emoji: "🧰",
        title: "Memory·Agentic RAG·Tool Use",
        url: notion("3918c9651798811298a0e358f8608690"),
      },
      {
        emoji: "🧠",
        title: "Reasoning·Planning·Inference-Time Compute",
        url: notion("3918c9651798819ab53fd336678ad8fa"),
      },
      {
        emoji: "🔬",
        title: "Domain-Specific Agent·Deep Research",
        url: notion("3918c965179881c69a3be798c3d160cb"),
      },
      {
        emoji: "📏",
        title: "평가·신뢰성·발전 방향",
        url: notion("3918c965179881f8a308e25806edc552"),
      },
    ],
  },
  {
    name: "AI 활용",
    notes: [
      {
        emoji: "🔢",
        title: "100% 정수연산 양자화",
        url: notion("3918c965179881dbb690cb7783d9873f"),
      },
      {
        emoji: "🧪",
        title: "TTA·분포 이동·도메인 적응",
        url: notion("3918c965179881a0a23efe41d495a247"),
      },
      {
        emoji: "📡",
        title: "초거대 AI·적응적 센싱",
        url: notion("3918c96517988140859bcda771e3a239"),
      },
      {
        emoji: "🩺",
        title: "수면의학 도메인 AI·전문지식 주입",
        url: notion("3918c965179881e68506d7712e8ed92b"),
      },
    ],
  },
];

export const studyNoteCount = studyCategories.reduce(
  (total, category) => total + category.notes.length,
  0,
);
