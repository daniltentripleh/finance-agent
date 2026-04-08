export type Locale = "en" | "ko";

export const defaultLocale: Locale = "en";

const dictionaries = {
  en: {
    common: {
      cancel: "Cancel",
      remove: "Remove",
      run: "Run",
      save: "Save",
    },
    metadata: {
      title: "Finance Agent",
      description:
        "AI-powered financial analysis agent - DCF, comps, earnings, LBO, and more",
    },
    home: {
      settings: {
        title: "Browser API Key",
        serverDescription:
          "Optional override. Your deployment already has a server-side Anthropic key.",
        browserDescription:
          "Enter your Anthropic API key. Stored locally in your browser only.",
        note:
          "Your browser key is only used when the deployment does not already provide a server-side key.",
      },
      welcome: {
        subtitle:
          "Dynamic Claude plugin and skill discovery powered by Vercel Sandbox",
        emptyState:
          "No `.claude` commands, skills, or enabled plugins were discovered.",
        workspace: "Workspace",
        workspaceDescription:
          "Local `.claude` commands and skills discovered at runtime.",
        refreshHint:
          "Refresh the page after adding or removing `.claude` files or enabled plugins to see the current catalog.",
      },
      header: {
        docs: "Docs",
        serverKey: "server key",
        browserKey: "browser key",
        noKey: "no key",
        thinking: "thinking...",
        loadingModels: "Loading models...",
        noModels: "No models",
        models: (count: number) => `${count} models`,
      },
      chat: {
        askTask: "Ask a question or describe a task",
        chooseModelFirst: "Choose a model before sending a message.",
        failedLoadModels: "Failed to load models.",
        genericError: "An error occurred.",
        modelPending: "model pending",
        userLabel: "you >",
        agentLabel: "agent >",
        runningInSandbox: "running in vercel sandbox",
        waitingForModels: "Waiting for model list...",
        setApiKeyFirst: "Set your Anthropic API key first...",
        commandPlaceholder: (example: string) =>
          `Type a command (${example}) or ask a question...`,
        noModelsAvailable: "No models available",
        chooseModelHint:
          "Choose the model for this message, then press Enter to send.",
      },
      pluginCard: {
        counts: (commands: number, skills: number) =>
          `${commands} commands · ${skills} skills`,
      },
    },
  },
  ko: {
    common: {
      cancel: "취소",
      remove: "삭제",
      run: "실행",
      save: "저장",
    },
    metadata: {
      title: "파이낸스 에이전트",
      description:
        "DCF, 비교기업, 실적 분석, LBO 등을 지원하는 AI 금융 분석 에이전트",
    },
    home: {
      settings: {
        title: "브라우저 API 키",
        serverDescription:
          "선택 사항입니다. 현재 배포 환경에는 서버 측 Anthropic 키가 이미 설정되어 있습니다.",
        browserDescription:
          "Anthropic API 키를 입력하세요. 키는 브라우저에만 로컬로 저장됩니다.",
        note:
          "브라우저 키는 배포 환경에 서버 측 키가 없는 경우에만 사용됩니다.",
      },
      welcome: {
        subtitle:
          "Vercel Sandbox 기반의 동적 Claude 플러그인 및 스킬 탐색",
        emptyState:
          "발견된 `.claude` 명령어, 스킬 또는 활성화된 플러그인이 없습니다.",
        workspace: "워크스페이스",
        workspaceDescription:
          "런타임에 발견된 로컬 `.claude` 명령어와 스킬입니다.",
        refreshHint:
          "`.claude` 파일이나 활성화된 플러그인을 추가하거나 제거한 뒤 새로고침하면 최신 카탈로그를 볼 수 있습니다.",
      },
      header: {
        docs: "문서",
        serverKey: "서버 키",
        browserKey: "브라우저 키",
        noKey: "키 없음",
        thinking: "생각 중...",
        loadingModels: "모델 불러오는 중...",
        noModels: "모델 없음",
        models: (count: number) => `모델 ${count}개`,
      },
      chat: {
        askTask: "질문을 입력하거나 작업을 설명해 주세요",
        chooseModelFirst: "메시지를 보내기 전에 모델을 선택하세요.",
        failedLoadModels: "모델을 불러오지 못했습니다.",
        genericError: "오류가 발생했습니다.",
        modelPending: "모델 대기 중",
        userLabel: "나 >",
        agentLabel: "에이전트 >",
        runningInSandbox: "Vercel Sandbox에서 실행 중",
        waitingForModels: "모델 목록을 기다리는 중...",
        setApiKeyFirst: "먼저 Anthropic API 키를 설정하세요...",
        commandPlaceholder: (example: string) =>
          `명령어(${example})를 입력하거나 질문해 보세요...`,
        noModelsAvailable: "사용 가능한 모델이 없습니다",
        chooseModelHint:
          "이 메시지에 사용할 모델을 고른 뒤 Enter 키로 전송하세요.",
      },
      pluginCard: {
        counts: (commands: number, skills: number) =>
          `명령어 ${commands}개 · 스킬 ${skills}개`,
      },
    },
  },
} as const;

export type Dictionary = (typeof dictionaries)[Locale];

export function resolveLocale(input?: string | null): Locale {
  return input === "ko" ? "ko" : defaultLocale;
}

export function getLocaleFromCookieValue(value?: string | null): Locale {
  return resolveLocale(value);
}

export function getDictionary(locale: Locale) {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}
