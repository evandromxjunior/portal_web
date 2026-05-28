import oracledb from "oracledb";

import { getOraclePool } from "../db/oracle.js";

async function main() {
  const invoiceNumber = process.argv[2];

  if (!invoiceNumber) {
    throw new Error("Informe a duplicata/NF. Exemplo: npm run winthor:inspect-boleto -- 633757");
  }

  const pool = await getOraclePool();
  const connection = await pool.getConnection();

  try {
    const result = await connection.execute(
      `
        SELECT
          p.codcli,
          c.cliente,
          p.duplic,
          p.prest,
          p.codbarra,
          p.codbarra2,
          p.boleto,
          p.nossonumbco,
          p.nossonumbco2,
          p.pastaarquivoboleto,
          p.dtvenc,
          p.valor
        FROM pcprest p
        JOIN pcclient c ON c.codcli = p.codcli
        WHERE TO_CHAR(p.duplic) = :invoiceNumber
        ORDER BY p.dtvenc DESC
        FETCH FIRST 10 ROWS ONLY
      `,
      { invoiceNumber },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log(JSON.stringify(result.rows ?? [], null, 2));
  } finally {
    await connection.close();
    await pool.close(10);
  }
}

main().catch((error) => {
  console.error("\nFalha ao inspecionar arquivo de boleto:");
  console.error(error);
  process.exit(1);
});
