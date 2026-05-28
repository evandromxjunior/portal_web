import cors from "cors";
import express from "express";

import { config } from "./config.js";
import { closeOraclePool } from "./db/oracle.js";
import { receivablesRouter } from "./routes/receivables.js";
import { whatsappRouter } from "./routes/whatsapp.js";
import { winthorApiRouter } from "./routes/winthorApi.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    mode: config.useMockData ? "mock" : "winthor-oracle",
    totvsApiConfigured: Boolean(config.totvsApi.baseUrl)
  });
});

app.use("/api/receivables", receivablesRouter);
app.use("/api/whatsapp", whatsappRouter);
app.use("/api/winthor-api", winthorApiRouter);

app.use((error: Error, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error(error);

  response.status(500).json({
    message: "Nao foi possivel processar a solicitacao.",
    detail: config.nodeEnv === "development" ? error.message : undefined
  });
});

const server = app.listen(config.port, () => {
  console.log(`API rodando em http://localhost:${config.port}`);
});

async function shutdown() {
  server.close(async () => {
    await closeOraclePool();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
