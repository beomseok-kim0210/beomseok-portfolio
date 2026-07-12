// 노션 "2026 트랜드 디자인 프롬프트 zip." — ChatGPT 이미지 생성용 디자인 스타일 프롬프트 8종.
// 사용법: 스타일을 입히고 싶은 이미지를 첨부 → 수정 요청을 적고 → 아래 프롬프트를 복사해 붙여넣기.

export type DesignPrompt = {
  id: string;
  nameKo: string;
  nameEn: string;
  description: string;
  tip?: string;
  prompt: string;
};

export const designPrompts: DesignPrompt[] = [
  {
    id: "01",
    nameKo: "그레인 블러",
    nameEn: "Grain Blur",
    description: "몽환적인 가우시안 블러 + 미세한 그레인 노이즈로 안개 낀 분위기를 연출합니다.",
    prompt:
      "Transform the image with a soft Gaussian blur and fine grain overlay. Create a dreamy, hazy atmosphere with subtle noise texture while preserving the original subject and composition.",
  },
  {
    id: "02",
    nameKo: "리퀴드 글라스",
    nameEn: "Liquid Glass",
    description: "고급 광학 크리스탈 유리 오브젝트를 얹어 굴절·반사·프리즘 하이라이트를 표현합니다.",
    tip: "배경 이미지를 첨부하고, 프롬프트 앞의 [원하는 모양]을 원하는 형태로 바꿔주세요.",
    prompt:
      "[원하는 모양을 적어주세요 (언어 상관 없음)]. Transform the uploaded image by adding premium optical liquid glass objects. If a specific liquid glass shape is provided, preserve that exact silhouette. Otherwise, generate naturally shaped premium liquid glass objects with varied organic forms and sizes. The liquid glass should be made from ultra-clear high-index optical crystal with thick transparent glass, smooth inflated geometry, rounded seamless edges, and a flawless polished surface. The crystal must exhibit physically accurate optical behavior including strong refraction, realistic internal reflections, subtle chromatic dispersion, delicate rainbow prism highlights, realistic caustics, and soft chromatic aberration along the edges. The glass should naturally magnify, bend, warp, and distort the uploaded image behind it instead of appearing frosted or opaque. Preserve the original composition, typography, graphics, colors, and layout of the uploaded image. Only overlay the optical liquid glass elements so they integrate naturally into the design. Match the perspective, lighting, shadows, and depth of the existing composition. Contemporary industrial design aesthetic inspired by OPPO concept renders, premium optical crystal objects, and modern editorial posters. Ultra-realistic, physically based rendering, pristine transparent material, luxurious minimalism, 8K.",
  },
  {
    id: "03",
    nameKo: "하프톤 도트",
    nameEn: "Halftone Dot",
    description: "4색 이하의 리소그래프 인쇄 질감 — 45° AM 하프톤 스크린과 인쇄 미스레지스터를 표현합니다.",
    prompt:
      "Authentic analog Risograph print. 4 or fewer ink colors only. Bold flat shapes. True ordered AM halftone screen at 45°. Tone created only by varying dot size. No gradients. Visible print misregistration, paper grain, and ink bleed. Looks like a scanned vintage print, not a digital halftone filter.",
  },
  {
    id: "04",
    nameKo: "나이브 디자인 (낙서)",
    nameEn: "Naive Design",
    description: "주제만 아이 그림풍 일러스트로, 나머지는 정제된 스위스 편집 레이아웃으로 대비를 만듭니다.",
    prompt:
      "Naive Design style. Transform ONLY the main subject into a simple childlike illustration inspired by children's drawings. Use bold flat colors, primitive shapes, uneven hand-drawn outlines, playful asymmetry, naive proportions, and a spontaneous handcrafted feel. It should look drawn with crayons, colored pencils, markers, or brush pens, embracing charming imperfections without becoming messy.\n\nEverything else must remain professionally designed: clean Swiss editorial layout, modern digital typography, precise alignment, balanced spacing, crisp vector graphics, generous whitespace, and premium print-quality composition. Create a strong contrast between the naive illustration and the refined editorial design. Subtle paper texture is welcome, but avoid grunge, photorealism, excessive shading, or overly detailed rendering.",
  },
  {
    id: "05",
    nameKo: "데이터 디자인",
    nameEn: "Data Design",
    description: "레트로 1비트 비트맵과 ASCII 아트로 디더링된 데이터-디자인 포스터를 만듭니다.",
    tip: "색감을 원하면 프롬프트 앞의 [색감]을 채워주세요. 기본은 흑백으로 추출됩니다.",
    prompt:
      "[색감: 원하는 색감을 입력해주세요 (언어 상관 없음)]. Transform the subject into a bitmap / data-design composition in the style of retro 1-bit computer graphics and generative ASCII art. Render it as high-contrast dithered halftone: visible square pixels, floyd-steinberg error-diffusion dots, and scattered single-pixel noise at the edges that fades into empty negative space. Let part of the form dissolve into dense monospace ASCII typography — clusters of letters and glyphs forming the shapes and tonal gradients of the subject, sparse glyphs floating in the background. Editorial poster aesthetic: flat 2D, coarse low resolution, no smooth shading, paper-grain texture, bold title-style typography. Keep it graphic and stark.",
  },
  {
    id: "06",
    nameKo: "서베일런스",
    nameEn: "Surveillance",
    description: "객체 탐지 박스·크롭 마크·트래킹 프레임 등 감시 UI를 얹은 하이패션 에디토리얼 포스터.",
    prompt:
      "Transform the image into a high-fashion editorial poster with a surveillance interface aesthetic. Add oversized condensed typography, object detection boxes, crop marks, grid lines, tracking frames, scan markers, technical labels, timestamps, and subtle UI graphics layered naturally into the composition. Use an experimental magazine layout with overlapping elements, bold hierarchy, white typography with small yellow accents, and a clean yet dynamic Y2K utility graphic style. Keep the original subject as the focal point while making the design feel like a premium fashion campaign.",
  },
  {
    id: "07",
    nameKo: "페이퍼 컷아웃",
    nameEn: "Paper Cutout",
    description: "첨부 이미지를 종이 콜라주로 재구성한 미니멀 에디토리얼 포스터 — 찢긴 종이 결과 여백을 강조.",
    prompt:
      "Create a sophisticated minimalist editorial poster by creatively combining all uploaded images into one cohesive fashion-inspired composition. Transform every primary visual element from the uploaded images into handcrafted layered paper cut-outs while preserving their recognizable forms. The overall composition should feel elegant, contemporary, and editorial rather than decorative or busy. Each paper cut-out should feature: layered paper construction, subtle paper texture, realistic torn paper edges where appropriate, soft natural shadows, delicate three-dimensional depth, and clean silhouettes. Design the layout with a strong editorial hierarchy, allowing one dominant subject to become the primary focal point while supporting elements remain minimal and carefully placed. Use generous negative space throughout the composition. Incorporate torn-paper reveals and layered paper strips as key visual elements instead of excessive decorative graphics. Typography should be oversized, elegant, and integrated into the composition like a high-fashion magazine cover. Allow typography to partially overlap or sit behind the main subject. Use only a few carefully selected graphic accents such as torn paper strips, thin editorial lines, subtle frames, minimal geometric shapes, small typography blocks, and simple paper labels. Avoid decorative icons such as stars, arrows, speech bubbles, stickers, comic bursts, grids, or excessive paper embellishments. Use a restrained color palette with one dominant neutral background and one bold accent color (such as cobalt blue, crimson red, emerald green, or black). Maintain an airy, balanced composition with refined spacing and modern visual rhythm. The final artwork should resemble a luxury fashion editorial, contemporary magazine cover, or premium branding campaign, blending handcrafted paper collage aesthetics with minimalist editorial graphic design. Do not simply apply a paper-cut filter. Reconstruct the uploaded images into a refined minimalist editorial collage with intentional typography, torn paper details, generous negative space, and sophisticated visual hierarchy.",
  },
  {
    id: "08",
    nameKo: "텍타일 아날로그",
    nameEn: "Tactile Analog",
    description: "배경 재질에 텍스트가 음각·양각으로 눌린 촉각적 바스-릴리프를 탑다운으로 촬영한 느낌.",
    tip: "프롬프트 안의 [배경 입력]과 [텍스트 입력] 괄호를 채워주세요 (영어 권장).",
    prompt:
      'A [배경 입력 (영어 권장)] surface photographed from directly above, perfectly flat top-down view, no perspective distortion. The text "[넣고 싶은 텍스트 입력 (영어 권장)]" is embossed and debossed directly INTO the [배경 입력] itself — not printed, not overlaid — so the letters are physically pressed into and raised out of the surface, sharing the exact same texture, color, and material as the background. Soft directional light casts subtle shadows inside the recessed grooves and gentle highlights on the raised edges, creating a tactile bas-relief effect. Monochromatic, tone-on-tone: letters are the same color and material as the surface. Macro photographic detail, sharp focus across the whole frame, high resolution, premium editorial aesthetic. No flat graphic text, no color contrast on the letters, no angled perspective.',
  },
];
