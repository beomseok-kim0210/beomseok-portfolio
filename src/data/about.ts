export const aboutProfile = [
  { label: "Name", value: ["Kim Beomseok"] },
  { label: "Role", value: ["AI Product Engineer"] },
  { label: "Location", value: ["Seoul, Korea"] },
  { label: "Education", value: ["International Trade Major"] },
  { label: "Training", value: ["Prompt Engineering Bootcamp", "SSAFY 14th"] },
  {
    label: "Interests",
    value: [
      "AI Agents",
      "Computer Vision",
      "Generative AI",
      "Multi-Agent Systems",
    ],
  },
  {
    label: "Current Focus",
    value: ["MCP", "Voice AI", "AI Product Engineering"],
  },
  { label: "Projects", value: ["4 Major Projects"] },
  { label: "Awards", value: ["2 Awards"] },
] as const;

export const aboutSnapshot = [
  { value: "4+", label: "2D->3D Models Evaluated" },
  { value: "50+", label: "AI Experiments Conducted" },
  { value: "18", label: "Tracked Keypoints" },
  { value: "200+", label: "Threshold Tuning Tests" },
  { value: "5", label: "Role-Based Agents" },
  { value: "1st", label: "SSAFY Common Project" },
] as const;

export const aboutIntroduction =
  "I started from an International Trade background, then moved into AI through Prompt Engineering Bootcamp and SSAFY. Across Wedding AI, ARMI, Hangarae, and Claw Dev, I have focused on turning AI models into product decisions, realtime interfaces, and user-facing systems.";

export const aboutJourney = [
  {
    step: "Step 01",
    year: "2023",
    title: "Prompt Engineering Bootcamp",
    groups: [
      {
        label: "Core Skills",
        items: ["Python", "Stable Diffusion", "RAG", "Prompt Engineering"],
      },
      { label: "Project", items: ["Wedding AI"] },
      { label: "Achievement", items: ["Best Project Award"] },
    ],
  },
  {
    step: "Step 02",
    year: "2024",
    title: "Generative AI Grand Prize",
    groups: [
      { label: "Achievement", items: ["Best Project Award"] },
      { label: "Focus", items: ["Generative AI", "Prompt-based Product Design"] },
    ],
  },
  {
    step: "Step 03",
    year: "2025",
    title: "SSAFY",
    groups: [
      { label: "Core Skills", items: ["Python", "Algorithms", "Django", "Vue"] },
      { label: "Projects", items: ["ARMI", "Hangarae"] },
    ],
  },
  {
    step: "Step 04",
    year: "2026",
    title: "ARMI",
    groups: [
      {
        label: "Core Skills",
        items: ["Voice AI", "STT/TTS", "State Machine", "WebSocket", "Real-time Systems"],
      },
      { label: "Achievement", items: ["SSAFY Common Project Winner"] },
    ],
  },
  {
    step: "Step 05",
    year: "2026",
    title: "Hangarae",
    groups: [
      {
        label: "Core Skills",
        items: ["YOLO", "Pose Estimation", "Redis", "Three.js", "AIoT"],
      },
      {
        label: "Metrics",
        items: ["18 Keypoints", "54 Values / Frame", "200+ Threshold Tests"],
      },
    ],
  },
  {
    step: "Step 06",
    year: "Present",
    title: "Claw Dev",
    groups: [
      { label: "Core Skills", items: ["MCP", "Claude Code", "Multi-Agent", "Tool Calling"] },
      { label: "Metrics", items: ["5 Role-Based Agents"] },
    ],
  },
] as const;

export const aboutFocusAreas = [
  {
    title: "AI Agents",
    description: "AI가 단순 응답을 넘어 행동을 수행하는 시스템 설계",
    technologies: ["Qwen", "MCP", "WebSocket", "STT/TTS"],
    projects: ["ARMI", "Claw Dev"],
  },
  {
    title: "Computer Vision",
    description: "사용자의 움직임을 실시간 데이터로 변환",
    technologies: ["YOLO", "Depth Camera", "Redis"],
    projects: ["Hangarae"],
  },
  {
    title: "Generative AI",
    description: "모델 활용이 아닌 검증과 평가 중심 접근",
    technologies: ["Stable Diffusion", "RAG", "Prompt Engineering"],
    projects: ["Wedding AI"],
  },
  {
    title: "Product Engineering",
    description: "사용자 경험 중심 AI 서비스 구현",
    technologies: ["Flutter", "React", "Django"],
    projects: ["ARMI", "Hangarae"],
  },
] as const;

export const aboutToolbox = [
  { title: "AI", items: ["GPT", "Claude", "Qwen"] },
  { title: "Agent", items: ["MCP", "RAG", "Tool Calling"] },
  { title: "Frontend", items: ["React", "Flutter", "Three.js"] },
  { title: "Backend", items: ["Spring", "Django", "Redis"] },
  { title: "Computer Vision", items: ["YOLO", "OpenCV", "Depth Camera"] },
  { title: "Infra", items: ["GitHub", "Vercel", "Cloudinary"] },
] as const;

export const aboutAwards = [
  {
    title: "Generative AI Grand Prize",
    description: "Prompt Engineering Bootcamp project recognition",
  },
  {
    title: "SSAFY Common Project 1st",
    description: "ARMI voice AI and realtime care workflow project",
  },
] as const;

export const aboutExploration = [
  { title: "MCP", status: "Researching" },
  { title: "Multi-Agent Systems", status: "Building" },
  { title: "AI Product Engineering", status: "Experimenting" },
  { title: "Voice AI", status: "Building" },
] as const;
