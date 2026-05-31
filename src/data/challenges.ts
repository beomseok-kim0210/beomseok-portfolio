import type { Challenge } from "@/types/portfolio";

export const challenges: Challenge[] = [
  {
    title: "마이크를 동시에 쓰는 기능들이 충돌하던 문제",
    shortLabel: "Voice State Machine",
    summary:
      "STT, 웨이크워드, 발화자 검증이 모두 마이크를 사용하면서 음성 흐름이 꼬일 수 있었습니다.",
    problem:
      "ARMI 환자 앱은 STT, 웨이크워드, 발화자 검증이 모두 마이크를 사용하는 구조였습니다. SpeechRecognizer와 AudioRecord 기반 PCM 캡처가 동시에 필요해 안정적 운용이 어려웠습니다.",
    investigation:
      "처음에는 발화자 검증 모델의 정확도 문제처럼 보였지만, 실제로는 마이크 소유권과 상태 전환 문제가 더 컸습니다. STT 실패, 검증 실패, 마이크 점유 충돌, stale callback, TTS 이후 STT 재시작 타이밍을 분리해 분석했습니다.",
    solution:
      "음성 흐름을 기능 단위가 아니라 마이크 소유권 기준으로 재해석했습니다. 웨이크워드 대기, 감지, 발화자 검증 캡처, STT 명령 인식, AI 응답, TTS 출력, 다음 대화 여부 판단 순서로 상태를 정리했습니다.",
    result:
      "문제를 모델 정확도가 아니라 입력 품질과 상태 관리 문제로 재정의했습니다. 음성 AI 기능은 독립 기능이 아니라 하나의 상태 머신으로 설계해야 한다는 인사이트를 얻었습니다.",
    tech: ["SpeechRecognizer", "AudioRecord", "Sherpa-ONNX", "CAMPPlus", "MethodChannel"],
  },
  {
    title: "AI가 말하는 중에 다시 듣거나, 말한 뒤 듣지 못하던 문제",
    shortLabel: "TTS ↔ STT Loop",
    summary:
      "TTS와 STT의 타이밍이 어긋나면 앱이 자기 목소리를 다시 듣거나 대화가 끊겼습니다.",
    problem:
      "ARMI는 AI 응답을 TTS로 읽어준 뒤 다시 후속 질문을 받을 수 있어야 했습니다. 하지만 TTS 중 STT가 켜지면 앱이 자기 음성을 다시 인식했고, TTS 이후 STT가 재시작되지 않으면 대화가 끊겼습니다.",
    investigation:
      "TTS 중 STT가 켜지는 문제, TTS 완료 후 STT가 재시작되지 않는 문제, 직접 입력 중 자동 listening으로 돌아가는 문제, 대화 모드 종료 후에도 STT 루프가 남는 문제를 시나리오별로 분리했습니다.",
    solution:
      "Android UtteranceProgressListener의 TTS 완료 이벤트를 다음 상태 전환 기준점으로 삼았습니다. AI 응답 생성, TTS 시작, speaking 전환, 완료 콜백, 대화 모드 확인, 필요 시 STT 재시작 흐름으로 정리했습니다.",
    result:
      "TTS가 단순 출력이 아니라 음성 UX 전체의 다음 상태를 결정하는 트리거라는 점을 이해했습니다. 말하기와 듣기가 동시에 켜지지 않도록 전환 기준을 명확히 했습니다.",
    tech: ["TextToSpeech", "UtteranceProgressListener", "SpeechRecognizer", "Flutter", "MethodChannel"],
  },
  {
    title: "연결은 됐지만 이벤트를 받지 못하던 문제",
    shortLabel: "WebSocket Resubscribe",
    summary:
      "WebSocket이 연결되어도 topic 구독이 복구되지 않으면 실시간 이벤트를 받을 수 없었습니다.",
    problem:
      "ARMI는 환자 요청, AI 응답, 로봇 미션 상태, 간호사 호출 상태를 실시간 반영해야 했습니다. 하지만 WebSocket 연결이 성공해도 필요한 topic에 subscribe되지 않으면 이벤트를 받을 수 없었습니다.",
    investigation:
      "REST API 성공, WebSocket 연결 성공, STOMP 연결, topic subscription을 분리해 분석했습니다. `/topic/tablets/{tabletId}`와 `/topic/tablets/{tabletId}/sessions/{sessionId}`를 함께 관리해야 했습니다.",
    solution:
      "connection state와 subscription state를 분리했습니다. reconnect 이후 기존 구독 목록을 기준으로 tablet topic과 session topic을 다시 구독하는 전략이 필요하다고 판단했습니다.",
    result:
      "실시간 통신에서 중요한 것은 연결 자체보다 끊겼을 때 어떻게 복구하고 다시 같은 상태로 돌아오는가라는 점을 배웠습니다. 이벤트 수신 실패는 곧 UI 상태 불일치로 이어졌습니다.",
    tech: ["STOMP WebSocket", "Flutter", "Spring Boot", "Reconnect", "Topic Subscription"],
  },
  {
    title: "긴급 호출이 알림 폭탄이 되지 않게 해야 했던 문제",
    shortLabel: "Galaxy Watch Alert UX",
    summary:
      "Galaxy Watch에서 최초 로드와 신규 호출을 구분하지 않으면 불필요한 반복 진동이 발생할 수 있었습니다.",
    problem:
      "환자의 간호사 호출은 Galaxy Watch에서 즉시 확인되어야 했습니다. 하지만 앱 최초 실행 시 기존 호출 목록 전체에 진동을 울리면 알림 폭탄이 될 수 있었습니다.",
    investigation:
      "호출 상태를 PENDING, IN_PROGRESS, COMPLETED, CANCELED로 나누고 최초 로드, 신규 호출, 중복 호출, 긴급 호출을 구분해야 한다고 판단했습니다. Polling은 단순하지만 최대 5초 지연이 생길 수 있었습니다.",
    solution:
      "requestId 기반으로 이미 알림을 보낸 요청을 기억하고 최초 로드 데이터와 신규 이벤트를 구분하는 구조를 검토했습니다. 일반 호출과 긴급 호출의 진동, 상단 고정, 시각 강조를 다르게 설계했습니다.",
    result:
      "의료 알림 시스템은 알림을 많이 보내는 것이 아니라 필요한 순간에 필요한 강도로 정확히 전달하는 것이 중요하다는 점을 배웠습니다.",
    tech: ["WearOS", "Kotlin", "Android Notification", "Polling", "FCM", "Urgency UX"],
  },
  {
    title: "재활 동작에서 발끝과 뒤꿈치를 추적하지 못하던 문제",
    shortLabel: "YOLOv11-M Foot Tracking",
    summary:
      "기존 YOLOv11 모델은 주요 관절은 인식했지만 재활에 중요한 발 포인트를 인식하지 못했습니다.",
    problem:
      "기존 YOLOv11 모델은 주요 관절은 인식할 수 있었지만 재활 동작에서 중요한 발가락과 발뒤꿈치 포인트를 인식하지 못했습니다. Jetson Nano 온디바이스 환경이라 속도와 경량화도 중요했습니다.",
    investigation:
      "MediaPipe 대비 Jetson Nano 환경에서의 추론 속도 문제를 고려했고, 발 포인트 인식 성능 개선을 위해 별도 데이터 구축이 필요하다고 판단했습니다. MMPOSE로 약 66,950장의 전신 이미지 중 20,507장의 발 데이터를 선별했습니다.",
    solution:
      "20,507장의 발 데이터를 직접 선별 및 수동 라벨링하고 YOLOv11-M 모델을 파인튜닝 및 재학습했습니다. 이를 통해 발 포인트 인식이 가능하도록 모델을 개선했습니다.",
    result:
      "Precision은 0.447에서 0.982, mAP50은 0.872에서 0.988, mAP50-95는 0.747에서 0.925로 향상되었습니다. 온디바이스에서도 안정적인 실시간 추론 수준을 확보했습니다.",
    tech: ["YOLOv11-M", "MMPOSE", "Jetson Nano", "Manual Labeling", "Fine-tuning", "Pose Estimation"],
  },
  {
    title: "기술적으로 가능했지만 제품에 맞지 않아 중단한 문제",
    shortLabel: "AI Product Decision",
    summary:
      "2D→3D 변환은 가능했지만 웨딩드레스의 부피감과 레이어 구조를 안정적으로 표현하기 어려웠습니다.",
    problem:
      "웨딩드레스 가상 피팅에서 2D 이미지를 3D로 변환하는 방식은 기술적으로 매력적이었습니다. 하지만 드레스 특유의 부피감과 레이어 구조 때문에 디테일 손실과 실루엣 왜곡이 반복되었습니다.",
    investigation:
      "SMPL, PIFuHD, ICON, ECON 등 공개 3D 모델 파이프라인을 적용해 2D 이미지에서 3D 모델로 변환하는 가능성을 실험했습니다. Blender와 MCP를 활용한 후속 개인 실험도 진행했습니다.",
    solution:
      "처리 비용, 결과 안정성, 다양한 케이스 대응 측면에서 실서비스 품질 기준에 맞지 않는다고 판단해 3D 적용을 중단했습니다. AI를 선택 이전 단계의 비교 효율을 높이는 도구로 재정의했습니다.",
    result:
      "기술적 가능성과 제품 적용 가능성은 다르다는 기준을 갖게 되었습니다. 이 판단 과정은 생성형 AI 활용 산업융합 프로젝트 최우수상 수상으로 이어졌습니다.",
    tech: ["Generative AI", "SMPL", "PIFuHD", "ICON", "ECON", "Blender", "MCP"],
  },
];
