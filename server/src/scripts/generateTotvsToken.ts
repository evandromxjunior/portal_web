import crypto from "node:crypto";
import "dotenv/config";

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Configure ${name} no arquivo .env.`);
  }

  return value;
}

function md5Upper(value: string) {
  return crypto.createHash("md5").update(value).digest("hex").toUpperCase();
}

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function readNestedValue(payload: unknown, path: string): unknown {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  return path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    return (current as Record<string, unknown>)[key];
  }, payload);
}

async function main() {
  const password = process.argv[2] ?? process.env.TOTVS_API_LOGIN_PASSWORD;

  if (!password) {
    throw new Error(
      "Informe a senha como argumento ou configure TOTVS_API_LOGIN_PASSWORD no .env."
    );
  }

  const passwordMode = process.env.TOTVS_API_PASSWORD_MODE ?? "md5_upper";
  const normalizedPasswordMode = passwordMode.toLowerCase();
  const formattedPassword =
    normalizedPasswordMode === "already_md5"
      ? password.toUpperCase()
      : normalizedPasswordMode === "md5_upper"
        ? md5Upper(password.toUpperCase())
        : password;

  console.log("Senha formatada para WTA:");
  console.log(formattedPassword);

  if (!process.env.TOTVS_API_BASE_URL || !process.env.TOTVS_API_LOGIN_PATH) {
    console.log(
      "\nPara gerar o token automaticamente, configure TOTVS_API_BASE_URL e TOTVS_API_LOGIN_PATH no .env."
    );
    return;
  }

  const baseUrl = requiredEnv("TOTVS_API_BASE_URL");
  const loginPath = requiredEnv("TOTVS_API_LOGIN_PATH");
  const loginUser = requiredEnv("TOTVS_API_LOGIN_USER");
  const loginUserField = process.env.TOTVS_API_LOGIN_USER_FIELD ?? "login";
  const loginPasswordField = process.env.TOTVS_API_LOGIN_PASSWORD_FIELD ?? "senha";
  const tokenField = process.env.TOTVS_API_TOKEN_FIELD ?? "accessToken";

  const body = {
    [loginUserField]: loginUser,
    [loginPasswordField]: formattedPassword
  };

  const response = await fetch(joinUrl(baseUrl, loginPath), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    console.error(`\nFalha ao autenticar: HTTP ${response.status}`);
    console.error(payload);
    process.exit(1);
  }

  const token =
    readNestedValue(payload, tokenField) ??
    readNestedValue(payload, "access_token") ??
    readNestedValue(payload, "accessToken") ??
    readNestedValue(payload, "acessToken") ??
    readNestedValue(payload, "data.token");

  console.log("\nResposta da API:");
  console.dir(payload, { depth: 5 });

  if (token) {
    console.log(`\nToken encontrado (${tokenField}):`);
    console.log(String(token));
  } else {
    console.log(
      `\nNao encontrei token no campo ${tokenField}. Ajuste TOTVS_API_TOKEN_FIELD conforme a resposta acima.`
    );
  }
}

main().catch((error) => {
  console.error("\nFalha ao gerar token TOTVS/WTA:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
