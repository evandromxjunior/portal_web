import cors from "cors";
import express from "express";

import { config } from "./config.js";
import { closeOraclePool, getOraclePool } from "./db/oracle.js";
import { warmWinthorReceivablesSchema } from "./repositories/winthorReceivablesRepository.js";
import { receivablesRouter } from "./routes/receivables.js";
import { whatsappRouter } from "./routes/whatsapp.js";
import { winthorApiRouter } from "./routes/winthorApi.js";

const app = express();

app.use(
  cors({
    origin: config.corsOrigin
  })
);
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

const server = app.listen(config.port, config.host, () => {
  console.log(`API rodando em http://${config.host}:${config.port}`);

  if (!config.useMockData) {
    void getOraclePool()
      .then(() => warmWinthorReceivablesSchema())
      .then(() => console.log("Cache de schema WINTHOR aquecido."))
      .catch((error) => {
        console.warn("Nao foi possivel aquecer cache do WINTHOR:", error.message);
      });
  }
});

async function shutdown() {
  server.close(async () => {
    await closeOraclePool();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
