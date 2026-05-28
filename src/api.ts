/** Base da API em producao (ex.: https://api.seudominio.com). Vazio = mesmo host (dev com proxy Vite). */
export function apiUrl(path: string) {
  const base = import.meta.env.VITE_API_URL?.trim().replace(/\/$/, "") ?? "";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

export function isApiConfigured() {
  return Boolean(import.meta.env.VITE_API_URL?.trim());
}

export function getApiConfigurationError() {
  if (!import.meta.env.PROD || isApiConfigured()) {
    return null;
  }

  return "Consulta indisponivel: configure a variavel VITE_API_URL na Vercel com a URL publica da API Node (servidor onde roda o Oracle).";
}

type ApiErrorBody = {
  message?: string;
  detail?: string;
};

export async function fetchApi<T>(path: string): Promise<T> {
  const configurationError = getApiConfigurationError();

  if (configurationError) {
    throw new Error(configurationError);
  }

  const response = await fetch(apiUrl(path));
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    if (import.meta.env.PROD && !isApiConfigured()) {
      throw new Error(
        "A API nao esta configurada. Defina VITE_API_URL na Vercel apontando para o servidor da API."
      );
    }

    throw new Error(
      "Resposta invalida do servidor. Verifique se VITE_API_URL na Vercel aponta para a API Node e se ela esta no ar."
    );
  }

  const data = (await response.json()) as T & ApiErrorBody;

  if (!response.ok) {
    const message = data.message ?? "Nao foi possivel processar a solicitacao.";
    throw new Error(data.detail ? `${message} (${data.detail})` : message);
  }

  return data;
}
