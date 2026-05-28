import oracledb from "oracledb";

import { config } from "../config.js";
import { getOraclePool } from "../db/oracle.js";
import { resolveBoletoPdfPath } from "../services/boletoFileService.js";
import type { Receivable, ReceivableStatus, ReceivablesRepository } from "../types.js";
import { maskDocument, onlyDigits } from "../utils/document.js";

type OracleReceivableRow = {
  ID?: string;
  CUSTOMER_CODE?: string;
  CUSTOMER_NAME?: string;
  DOCUMENT?: string;
  BRANCH_CODE?: string | null;
  BRANCH_NAME?: string | null;
  BRANCH_DOCUMENT?: string | null;
  INVOICE_NUMBER?: string;
  INSTALLMENT?: string;
  DUE_DATE?: Date | string;
  AMOUNT?: number;
  PAID_AMOUNT?: number;
  PAYMENT_DATE?: Date | string | null;
  LINE_DIGITAVEL?: string | null;
  BOLETO_URL?: string | null;
  PDF_BASE64?: string | null;
  BARCODE?: string | null;
  NOSSO_NUMERO?: string | null;
  BOLETO_FILE_NAME?: string | null;
  BOLETO_FILE_PATH?: string | null;
};

const boletoColumnCandidates = {
  lineDigitavel: [
    "LINHADIGITAVEL",
    "LINHA_DIGITAVEL",
    "LINHADIG",
    "LINHADIGBOLETO",
    "DIGITAVEL",
    "CODIGOBARRAS",
    "CODIGO_BARRAS",
    "CODBARRA",
    "CODBARRAS",
    "CODBARRABOLETO",
    "CODBARRA_BOLETO"
  ],
  boletoUrl: ["BOLETO_URL", "URLBOLETO", "URL_BOLETO", "LINKBOLETO", "LINK_BOLETO"],
  pdfBase64: ["PDF_BASE64", "PDFBOLETO", "PDF_BOLETO", "ARQUIVOBOLETO", "ARQUIVO_BOLETO"]
};

let pcprestColumnsCache: Set<string> | undefined;
let pcclientColumnsCache: Set<string> | undefined;
let pcfilialColumnsCache: Set<string> | undefined;

async function getPcprestColumns(connection: oracledb.Connection) {
  if (pcprestColumnsCache) {
    return pcprestColumnsCache;
  }

  const result = await connection.execute<{ COLUMN_NAME: string }>(
    `
      SELECT column_name
      FROM all_tab_columns
      WHERE table_name = 'PCPREST'
    `,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  pcprestColumnsCache = new Set((result.rows ?? []).map((row) => row.COLUMN_NAME.toUpperCase()));
  return pcprestColumnsCache;
}

async function getPcclientColumns(connection: oracledb.Connection) {
  if (pcclientColumnsCache) {
    return pcclientColumnsCache;
  }

  const result = await connection.execute<{ COLUMN_NAME: string }>(
    `
      SELECT column_name
      FROM all_tab_columns
      WHERE table_name = 'PCCLIENT'
    `,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  pcclientColumnsCache = new Set((result.rows ?? []).map((row) => row.COLUMN_NAME.toUpperCase()));
  return pcclientColumnsCache;
}

async function getPcfilialColumns(connection: oracledb.Connection) {
  if (pcfilialColumnsCache) {
    return pcfilialColumnsCache;
  }

  const result = await connection.execute<{ COLUMN_NAME: string }>(
    `
      SELECT column_name
      FROM all_tab_columns
      WHERE table_name = 'PCFILIAL'
    `,
    {},
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  pcfilialColumnsCache = new Set((result.rows ?? []).map((row) => row.COLUMN_NAME.toUpperCase()));
  return pcfilialColumnsCache;
}

function columnExpression(columns: Set<string>, candidates: string[], alias: string, prefix = "p") {
  const column = candidates.find((candidate) => columns.has(candidate));
  return column ? `${prefix}.${column} AS ${alias}` : `NULL AS ${alias}`;
}

function requiredColumn(columns: Set<string>, candidates: string[], tableName: string) {
  const column = candidates.find((candidate) => columns.has(candidate));

  if (!column) {
    throw new Error(`Nenhuma coluna encontrada em ${tableName}: ${candidates.join(", ")}`);
  }

  return column;
}

function optionalColumn(columns: Set<string>, candidates: string[]) {
  return candidates.find((candidate) => columns.has(candidate));
}

function buildDefaultWinthorReceivablesSql(
  pcprestColumns: Set<string>,
  pcclientColumns: Set<string>,
  pcfilialColumns: Set<string>
) {
  const documentColumn = requiredColumn(
    pcclientColumns,
    ["CGCENT", "CGCCPF", "CNPJCPF", "CNPJ_CPF", "CPF", "CNPJ"],
    "PCCLIENT"
  );
  const lineDigitavel = columnExpression(
    pcprestColumns,
    boletoColumnCandidates.lineDigitavel,
    "line_digitavel"
  );
  const boletoUrl = columnExpression(pcprestColumns, boletoColumnCandidates.boletoUrl, "boleto_url");
  const pdfBase64 = columnExpression(pcprestColumns, boletoColumnCandidates.pdfBase64, "pdf_base64");
  const barcode = columnExpression(pcprestColumns, ["CODBARRA", "CODBARRA2"], "barcode");
  const nossoNumero = columnExpression(pcprestColumns, ["NOSSONUMBCO", "NOSSONUMBCO2"], "nosso_numero");
  const boletoFileName = columnExpression(pcprestColumns, ["BOLETO"], "boleto_file_name");
  const boletoFilePath = columnExpression(
    pcprestColumns,
    ["PASTAARQUIVOBOLETO", "PASTA_ARQUIVO_BOLETO", "CAMINHOBOLETO", "CAMINHO_BOLETO"],
    "boleto_file_path"
  );
  const branchColumn = optionalColumn(pcprestColumns, ["CODFILIAL", "CODFILIALNF", "CODFILIALCOB"]);
  const filialKeyColumn = optionalColumn(pcfilialColumns, ["CODIGO", "CODFILIAL"]);
  const hasFilialJoin = Boolean(branchColumn && filialKeyColumn);
  const filialJoin = hasFilialJoin
    ? `LEFT JOIN pcfilial f ON TO_CHAR(f.${filialKeyColumn}) = TO_CHAR(p.${branchColumn})`
    : "";
  const branchCode = branchColumn ? `TO_CHAR(p.${branchColumn}) AS branch_code` : "NULL AS branch_code";
  const branchName = hasFilialJoin
    ? columnExpression(
        pcfilialColumns,
        ["RAZAOSOCIAL", "RAZAO_SOCIAL", "FANTASIA", "NOME", "NOMEFILIAL"],
        "branch_name",
        "f"
      )
    : "NULL AS branch_name";
  const branchDocument = hasFilialJoin
    ? columnExpression(pcfilialColumns, ["CGC", "CNPJ", "CGCCPF", "CGCENT"], "branch_document", "f")
    : "NULL AS branch_document";

  return `
  SELECT
    TO_CHAR(p.codcli) || '-' || TO_CHAR(p.duplic) || '-' || TO_CHAR(p.prest) AS id,
    TO_CHAR(p.codcli) AS customer_code,
    c.cliente AS customer_name,
    c.${documentColumn} AS document,
    ${branchCode},
    ${branchName},
    ${branchDocument},
    TO_CHAR(p.duplic) AS invoice_number,
    TO_CHAR(p.prest) AS installment,
    p.dtvenc AS due_date,
    p.valor AS amount,
    p.vpago AS paid_amount,
    p.dtpag AS payment_date,
    ${lineDigitavel},
    ${boletoUrl},
    ${pdfBase64},
    ${barcode},
    ${nossoNumero},
    ${boletoFileName},
    ${boletoFilePath}
  FROM pcprest p
  JOIN pcclient c ON c.codcli = p.codcli
  ${filialJoin}
  WHERE REGEXP_REPLACE(c.${documentColumn}, '[^0-9]', '') = :document
    AND p.dtpag IS NULL
    AND NVL(p.valor, 0) > NVL(p.vpago, 0)
  ORDER BY branch_name, branch_code, p.dtvenc
`;
}

function toIsoDate(value: Date | string | undefined) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function getStatus(row: OracleReceivableRow): ReceivableStatus {
  if (row.PAYMENT_DATE) {
    return "paid";
  }

  const dueDate = new Date(toIsoDate(row.DUE_DATE));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return dueDate < today ? "overdue" : "open";
}

function mapRow(row: OracleReceivableRow): Receivable {
  const document = row.DOCUMENT ? maskDocument(String(row.DOCUMENT)) : "";
  const invoiceNumber = row.INVOICE_NUMBER ? String(row.INVOICE_NUMBER) : "";
  const installment = row.INSTALLMENT ? String(row.INSTALLMENT) : undefined;
  const id = String(row.ID ?? `${row.CUSTOMER_CODE}-${invoiceNumber}-${installment ?? "1"}`);
  const localPdfPath = resolveBoletoPdfPath({
    id,
    customerCode: row.CUSTOMER_CODE ? String(row.CUSTOMER_CODE) : undefined,
    invoiceNumber,
    installment,
    barcode: row.BARCODE,
    nossoNumero: row.NOSSO_NUMERO,
    boletoFileName: row.BOLETO_FILE_NAME,
    boletoFilePath: row.BOLETO_FILE_PATH
  });

  return {
    id,
    customerCode: row.CUSTOMER_CODE ? String(row.CUSTOMER_CODE) : undefined,
    customerName: row.CUSTOMER_NAME ? String(row.CUSTOMER_NAME) : "Cliente",
    document,
    branchCode: row.BRANCH_CODE ? String(row.BRANCH_CODE) : null,
    branchName: row.BRANCH_NAME ? String(row.BRANCH_NAME) : null,
    branchDocument: row.BRANCH_DOCUMENT ? maskDocument(String(row.BRANCH_DOCUMENT)) : null,
    invoiceNumber,
    installment,
    dueDate: toIsoDate(row.DUE_DATE),
    amount: Number(row.AMOUNT ?? 0),
    paidAmount: row.PAID_AMOUNT === undefined ? undefined : Number(row.PAID_AMOUNT),
    paymentDate: row.PAYMENT_DATE ? toIsoDate(row.PAYMENT_DATE) : null,
    status: getStatus(row),
    lineDigitavel: row.LINE_DIGITAVEL ?? null,
    boletoUrl: row.BOLETO_URL ?? (localPdfPath ? `/api/receivables/${encodeURIComponent(id)}/pdf` : null),
    pdfBase64: row.PDF_BASE64 ?? null
  };
}

export const winthorReceivablesRepository: ReceivablesRepository = {
  async findOpenByDocument(document: string) {
    const pool = await getOraclePool();
    const connection = await pool.getConnection();

    try {
      const defaultSql = config.winthorReceivablesSql
        ? undefined
        : buildDefaultWinthorReceivablesSql(
            await getPcprestColumns(connection),
            await getPcclientColumns(connection),
            await getPcfilialColumns(connection)
          );
      const result = await connection.execute<OracleReceivableRow>(
        config.winthorReceivablesSql ?? defaultSql!,
        { document: onlyDigits(document) },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return (result.rows ?? []).map(mapRow);
    } finally {
      await connection.close();
    }
  }
};
