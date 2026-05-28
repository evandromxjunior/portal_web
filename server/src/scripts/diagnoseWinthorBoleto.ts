import oracledb from "oracledb";

import { getOraclePool } from "../db/oracle.js";

type ColumnCandidate = {
  OWNER: string;
  TABLE_NAME: string;
  COLUMN_NAME: string;
  DATA_TYPE: string;
};

const boletoKeywords = [
  "%BOLETO%",
  "%BOL%",
  "%BARRA%",
  "%DIGIT%",
  "%NOSSONUM%",
  "%NOSSO_NUM%",
  "%REMESSA%",
  "%RETORNO%",
  "%PDF%",
  "%URL%"
];

async function main() {
  const pool = await getOraclePool();
  const connection = await pool.getConnection();

  try {
    const pcprestColumns = await connection.execute<ColumnCandidate>(
      `
        SELECT owner, table_name, column_name, data_type
        FROM all_tab_columns
        WHERE table_name = 'PCPREST'
          AND (
            column_name LIKE '%BOLETO%'
            OR column_name LIKE '%BOL%'
            OR column_name LIKE '%BARRA%'
            OR column_name LIKE '%DIGIT%'
            OR column_name LIKE '%NOSSONUM%'
            OR column_name LIKE '%NOSSO_NUM%'
            OR column_name LIKE '%PDF%'
            OR column_name LIKE '%URL%'
          )
        ORDER BY owner, table_name, column_name
      `,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const tableCandidates = await connection.execute<ColumnCandidate>(
      `
        SELECT owner, table_name, column_name, data_type
        FROM all_tab_columns
        WHERE (${boletoKeywords.map((_, index) => `column_name LIKE :keyword${index}`).join(" OR ")})
          AND table_name LIKE 'PC%'
        ORDER BY owner, table_name, column_name
        FETCH FIRST 120 ROWS ONLY
      `,
      Object.fromEntries(boletoKeywords.map((keyword, index) => [`keyword${index}`, keyword])),
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    console.log("\nColunas candidatas em PCPREST:");
    console.table(pcprestColumns.rows ?? []);

    console.log("\nColunas candidatas em tabelas PC*:");
    console.table(tableCandidates.rows ?? []);
  } finally {
    await connection.close();
    await pool.close(10);
  }
}

main().catch((error) => {
  console.error("\nFalha no diagnostico WINTHOR:");
  console.error(error);
  process.exit(1);
});
