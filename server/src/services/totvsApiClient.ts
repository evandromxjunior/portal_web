import crypto from "node:crypto";

import { assertTotvsApiConfig, config } from "../config.js";

type RequestOptions = {
  method?: "GET" | "POST";
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
};

let cachedToken: string | undefined;

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function buildQuery(params: RequestOptions["query"]) {
  const searchParams = new URLSearchParams();

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  return searchParams.toString();
}

function formatPassword(password: string) {
  const passwordMode = config.totvsApi.passwordMode.toLowerCase();

  if (passwordMode === "already_md5") {
    return password.toUpperCase();
  }

  if (passwordMode !== "md5_upper") {
    return password;
  }

  return crypto.createHash("md5").update(password.toUpperCase()).digest("hex").toUpperCase();
}

function readNestedValue(payload: unknown, path: string): string | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    return (current as Record<string, unknown>)[key];
  }, payload) as string | undefined;
}

async function getAuthToken() {
  if (config.totvsApi.token) {
    return config.totvsApi.token;
  }

  if (cachedToken) {
    return cachedToken;
  }

  const { loginPath, loginUser, loginPassword } = config.totvsApi;

  if (!loginPath || !loginUser || !loginPassword) {
    return undefined;
  }

  assertTotvsApiConfig();

  const body = {
    [config.totvsApi.loginUserField]: loginUser,
    [config.totvsApi.loginPasswordField]: formatPassword(loginPassword)
  };

  const response = await fetch(joinUrl(config.totvsApi.baseUrl!, loginPath), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Falha ao autenticar na API TOTVS/WTA: HTTP ${response.status}`);
  }

  const payload = await response.json();
  const token = readNestedValue(payload, config.totvsApi.tokenField);
  const fallbackToken =
    token ??
    readNestedValue(payload, "accessToken") ??
    readNestedValue(payload, "acessToken") ??
    readNestedValue(payload, "access_token") ??
    readNestedValue(payload, "data.token");

  if (!fallbackToken) {
    throw new Error(`Token nao encontrado no campo ${config.totvsApi.tokenField}.`);
  }

  cachedToken = fallbackToken;
  return fallbackToken;
}

export async function requestTotvsApi<T>(path: string, options: RequestOptions = {}) {
  assertTotvsApiConfig();

  const query = buildQuery(options.query);
  const url = `${joinUrl(config.totvsApi.baseUrl!, path)}${query ? `?${query}` : ""}`;
  const token = await getAuthToken();

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    throw new Error(`Falha na API TOTVS/WTA: HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}
