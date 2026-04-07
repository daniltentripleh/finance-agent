const ANTHROPIC_API_VERSION = "2023-06-01";
const MODELS_ENDPOINT = "https://api.anthropic.com/v1/models";

export interface AnthropicModelRecord {
  id: string;
  display_name: string;
  created_at: string;
  type: string;
}

export interface AnthropicModelsPage {
  data: AnthropicModelRecord[];
  has_more: boolean;
  first_id?: string;
  last_id?: string;
}

export interface ChatModelOption {
  id: string;
  displayName: string;
  createdAt: string;
}

export function mergeAnthropicModels(pages: AnthropicModelsPage[]) {
  const deduped = new Map<string, ChatModelOption>();

  for (const page of pages) {
    for (const model of page.data) {
      deduped.set(model.id, {
        id: model.id,
        displayName: model.display_name,
        createdAt: model.created_at,
      });
    }
  }

  return [...deduped.values()].sort((left, right) => {
    const createdDelta =
      Date.parse(right.createdAt) - Date.parse(left.createdAt);

    if (createdDelta !== 0) return createdDelta;
    return left.displayName.localeCompare(right.displayName);
  });
}

export function pickDefaultModelId(
  models: ChatModelOption[],
  preferredModelId?: string | null
) {
  const preferred = preferredModelId?.trim();
  if (preferred && models.some((model) => model.id === preferred)) {
    return preferred;
  }

  return models[0]?.id ?? null;
}

export async function fetchAnthropicModels(apiKey: string) {
  const pages: AnthropicModelsPage[] = [];
  let afterId: string | null = null;

  while (true) {
    const url = new URL(MODELS_ENDPOINT);
    if (afterId) {
      url.searchParams.set("after_id", afterId);
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_API_VERSION,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Anthropic Models API failed with ${response.status}: ${errorText}`
      );
    }

    const page = (await response.json()) as AnthropicModelsPage;
    pages.push(page);

    if (!page.has_more) break;
    afterId = page.last_id ?? page.data[page.data.length - 1]?.id ?? null;

    if (!afterId) break;
  }

  return mergeAnthropicModels(pages);
}
