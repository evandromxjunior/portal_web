import "dotenv/config";

type ProbeResult = {
  baseUrl: string;
  status: number | "erro";
  ok: boolean;
  tokenFound: boolean;
  detail?: string;
};

async function probeLogin(baseUrl: string): Promise<ProbeResult> {
  const loginPath = process.env.TOTVS_API_LOGIN_PATH ?? "/winthor/autenticacao/v1/login";
  const loginUser = process.env.TOTVS_API_LOGIN_USER;
  const loginPassword = process.env.TOTVS_API_LOGIN_PASSWORD;
  const loginUserField = process.env.TOTVS_API_LOGIN_USER_FIELD ?? "login";
  const loginPasswordField = process.env.TOTVS_API_LOGIN_PASSWORD_FIELD ?? "senha";

  if (!loginUser || !loginPassword) {
    return {
      baseUrl,
      status: "erro",
      ok: false,
      tokenFound: false,
      detail: "TOTVS_API_LOGIN_USER ou TOTVS_API_LOGIN_PASSWORD ausente"
    };
  }

  const passwordMode = (process.env.TOTVS_API_PASSWORD_MODE ?? "md5_upper").toLowerCase();
  const senha =
    passwordMode === "already_md5"
      ? loginPassword.toUpperCase()
      : await import("node:crypto").then(({ createHash }) =>
          createHash("md5").update(loginPassword.toUpperCase()).digest("hex").toUpperCase()
        );

  const url = `${baseUrl.replace(/\/$/, "")}${loginPath.startsWith("/") ? loginPath : `/${loginPath}`}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        [loginUserField]: loginUser,
        [loginPasswordField]: senha
      })
    });

    const text = await response.text();
    let payload: Record<string, unknown> = {};

    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { raw: text.slice(0, 120) };
    }

    const token =
      payload.accessToken ??
      payload.acessToken ??
      payload.access_token ??
      (payload.data as Record<string, unknown> | undefined)?.token;

    return {
      baseUrl,
      status: response.status,
      ok: response.ok,
      tokenFound: Boolean(token),
      detail: response.ok ? "Login OK" : JSON.stringify(payload).slice(0, 180)
    };
  } catch (error) {
    return {
      baseUrl,
      status: "erro",
      ok: false,
      tokenFound: false,
      detail: error instanceof Error ? error.message : String(error)
    };
  }
}

async function main() {
  const host = process.env.TOTVS_PROBE_HOST ?? "201.157.219.14";
  const ports = (process.env.TOTVS_PROBE_PORTS ?? "8889,8080,80,443,8443")
    .split(",")
    .map((port) => port.trim())
    .filter(Boolean);

  const schemes = (process.env.TOTVS_PROBE_SCHEMES ?? "http,https").split(",").map((s) => s.trim());

  console.log("Testando login WTA em combinacoes comuns...\n");

  const results: ProbeResult[] = [];

  for (const scheme of schemes) {
    for (const port of ports) {
      const baseUrl = `${scheme}://${host}:${port}`;
      const result = await probeLogin(baseUrl);
      results.push(result);
      console.log(
        `${result.ok ? "OK" : "FALHA"} | ${baseUrl} | status=${result.status} | token=${result.tokenFound ? "sim" : "nao"} | ${result.detail ?? ""}`
      );
    }
  }

  const winner = results.find((result) => result.ok && result.tokenFound);

  if (winner) {
    console.log(`\nURL recomendada para .env:\nTOTVS_API_BASE_URL=${winner.baseUrl}`);
  } else {
    console.log(
      "\nNenhuma combinacao respondeu login com token. Confirme IP/porta do WTA no servidor (rotina 801 / Postman LOCAL-8889)."
    );
  }
}

main().catch((error) => {
  console.error("Falha no probe WTA:", error);
  process.exit(1);
});
