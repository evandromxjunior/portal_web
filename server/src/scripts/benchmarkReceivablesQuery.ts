import { performance } from "node:perf_hooks";

import oracledb from "oracledb";

import { config } from "../config.js";
import { getOraclePool } from "../db/oracle.js";
import { getReceivablesRepository } from "../repositories/receivablesRepository.js";
import { warmWinthorReceivablesSchema } from "../repositories/winthorReceivablesRepository.js";
import { onlyDigits } from "../utils/document.js";

async function timed<T>(label: string, fn: () => Promise<T>) {
  const start = performance.now();
  const result = await fn();
  const ms = Math.round(performance.now() - start);
  console.log(`${label}: ${ms}ms`);
  return result;
}

async function main() {
  const document = onlyDigits(process.argv[2] ?? "85862589546");

  console.log("Modo:", config.useMockData ? "mock" : "oracle");
  console.log("Documento:", document);

  await timed("pool", () => getOraclePool());

  const pool = await getOraclePool();
  const connection = await pool.getConnection();

  try {
    await timed("cliente (regexp cgcent)", async () =>
      connection.execute(
        `
          SELECT codcli
          FROM pcclient
          WHERE REGEXP_REPLACE(cgcent, '[^0-9]', '') = :document
          FETCH FIRST 5 ROWS ONLY
        `,
        { document },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
    );

    await timed("cliente (cgcent = digitos)", async () =>
      connection.execute(
        `
          SELECT codcli
          FROM pcclient
          WHERE cgcent = :document
          FETCH FIRST 5 ROWS ONLY
        `,
        { document },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
    );

    await timed("cliente (replace cgcent)", async () =>
      connection.execute(
        `
          SELECT codcli
          FROM pcclient
          WHERE REPLACE(REPLACE(REPLACE(TRIM(cgcent), '.', ''), '-', ''), '/', '') = :document
          FETCH FIRST 5 ROWS ONLY
        `,
        { document },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      )
    );

    const clients = await connection.execute<{ CODCLI: number }>(
      `
        SELECT codcli
        FROM pcclient
        WHERE REGEXP_REPLACE(cgcent, '[^0-9]', '') = :document
        FETCH FIRST 1 ROWS ONLY
      `,
      { document },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const codcli = clients.rows?.[0]?.CODCLI;

    if (codcli) {
      await timed("titulos por codcli (sem filial)", async () =>
        connection.execute(
          `
            SELECT COUNT(*) AS total
            FROM pcprest p
            WHERE p.codcli = :codcli
              AND p.dtpag IS NULL
              AND NVL(p.valor, 0) > NVL(p.vpago, 0)
          `,
          { codcli },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        )
      );

      await timed("titulos por codcli (com filial)", async () =>
        connection.execute(
          `
            SELECT COUNT(*) AS total
            FROM pcprest p
            LEFT JOIN pcfilial f ON f.codigo = p.codfilial
            WHERE p.codcli = :codcli
              AND p.dtpag IS NULL
              AND NVL(p.valor, 0) > NVL(p.vpago, 0)
          `,
          { codcli },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        )
      );
    }
  } finally {
    await connection.close();
  }

  await timed("warm schema", () => warmWinthorReceivablesSchema());

  await timed("findOpenByDocument (1a consulta)", async () =>
    getReceivablesRepository().findOpenByDocument(document)
  );

  await timed("findOpenByDocument (2a consulta, cache)", async () =>
    getReceivablesRepository().findOpenByDocument(document)
  );

  await pool.close(10);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
