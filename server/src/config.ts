import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 3333),
  nodeEnv: process.env.NODE_ENV ?? "development",
  useMockData: (process.env.USE_MOCK_DATA ?? "true").toLowerCase() === "true",
  oracle: {
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECT_STRING
  },
  boletoFiles: {
    basePath: process.env.BOLETO_FILE_BASE_PATH
  },
  winthorReceivablesSql: process.env.WINTHOR_RECEIVABLES_SQL,
  winthorDocumentColumn: process.env.WINTHOR_DOCUMENT_COLUMN?.toUpperCase(),
  receivablesCacheTtlMs: Number(process.env.RECEIVABLES_CACHE_TTL_MS ?? 300_000),
  totvsApi: {
    baseUrl: process.env.TOTVS_API_BASE_URL,
    token: process.env.TOTVS_API_TOKEN,
    loginPath: process.env.TOTVS_API_LOGIN_PATH,
    loginUser: process.env.TOTVS_API_LOGIN_USER,
    loginPassword: process.env.TOTVS_API_LOGIN_PASSWORD,
    passwordMode: process.env.TOTVS_API_PASSWORD_MODE ?? "md5_upper",
    loginUserField: process.env.TOTVS_API_LOGIN_USER_FIELD ?? "login",
    loginPasswordField: process.env.TOTVS_API_LOGIN_PASSWORD_FIELD ?? "senha",
    tokenField: process.env.TOTVS_API_TOKEN_FIELD ?? "accessToken",
    customerListPath: process.env.TOTVS_API_CUSTOMER_LIST_PATH ?? "/api/wholesale/v1/customer/list",
    branchId: process.env.TOTVS_API_BRANCH_ID
  }
};

export function assertOracleConfig() {
  if (!config.oracle.user || !config.oracle.password || !config.oracle.connectString) {
    throw new Error(
      "Configure ORACLE_USER, ORACLE_PASSWORD e ORACLE_CONNECT_STRING no arquivo .env."
    );
  }
}

export function assertTotvsApiConfig() {
  if (!config.totvsApi.baseUrl) {
    throw new Error("Configure TOTVS_API_BASE_URL no arquivo .env.");
  }
}
