import oracledb from "oracledb";

import { getOraclePool } from "../db/oracle.js";
import { getReceivablesRepository } from "../repositories/receivablesRepository.js";
import { onlyDigits } from "../utils/document.js";

type ClientRow = {
  CODCLI: number;
  CLIENTE: string;
  CGCENT: string;
};

type TitleSummaryRow = {
  TOTAL: number;
  OPEN_COUNT: number;
};

async function main() {
  const document = onlyDigits(process.argv[2] ?? "");

  if (!document) {
    throw new Error("Informe o CPF/CNPJ. Exemplo: npm run winthor:consulta-documento -- 12345678000195");
  }

  const pool = await getOraclePool();
  const connection = await pool.getConnection();

  try {
    const clients = await connection.execute<ClientRow>(
      `
        SELECT codcli, cliente, cgcent
        FROM pcclient
        WHERE REGEXP_REPLACE(cgcent, '[^0-9]', '') = :document
        FETCH FIRST 5 ROWS ONLY
      `,
      { document },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const titleSummary = await connection.execute<TitleSummaryRow>(
      `
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN p.dtpag IS NULL THEN 1 ELSE 0 END) AS open_count
        FROM pcprest p
        JOIN pcclient c ON c.codcli = p.codcli
        WHERE REGEXP_REPLACE(c.cgcent, '[^0-9]', '') = :document
      `,
      { document },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const receivables = await getReceivablesRepository().findOpenByDocument(document);

    console.log(
      JSON.stringify(
        {
          document,
          clients: clients.rows ?? [],
          titleSummary: titleSummary.rows?.[0] ?? { TOTAL: 0, OPEN_COUNT: 0 },
          openReceivables: receivables.map((receivable) => ({
            id: receivable.id,
            customerName: receivable.customerName,
            invoiceNumber: receivable.invoiceNumber,
            installment: receivable.installment,
            dueDate: receivable.dueDate,
            amount: receivable.amount,
            status: receivable.status,
            hasLineDigitavel: Boolean(receivable.lineDigitavel),
            lineDigitavelPreview: receivable.lineDigitavel
              ? `${String(receivable.lineDigitavel).slice(0, 12)}...`
              : null,
            hasBoletoUrl: Boolean(receivable.boletoUrl),
            hasPdf: Boolean(receivable.pdfBase64)
          }))
        },
        null,
        2
      )
    );
  } finally {
    await connection.close();
    await pool.close(10);
  }
}

main().catch((error) => {
  console.error("\nFalha ao consultar documento no WINTHOR:");
  console.error(error);
  process.exit(1);
});
