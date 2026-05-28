import { Router } from "express";
import oracledb from "oracledb";

import { getOraclePool } from "../db/oracle.js";
import { getReceivablesRepository } from "../repositories/receivablesRepository.js";
import { resolveBoletoPdfPath } from "../services/boletoFileService.js";
import { isValidCustomerDocument, onlyDigits } from "../utils/document.js";

export const receivablesRouter = Router();

receivablesRouter.get("/", async (request, response, next) => {
  try {
    const document = String(request.query.document ?? "");

    if (!isValidCustomerDocument(document)) {
      response.status(400).json({
        message: "Informe um CPF ou CNPJ valido."
      });
      return;
    }

    const receivables = await getReceivablesRepository().findOpenByDocument(onlyDigits(document));

    response.json({
      document: onlyDigits(document),
      count: receivables.length,
      receivables
    });
  } catch (error) {
    next(error);
  }
});

receivablesRouter.get("/:id/pdf", async (request, response, next) => {
  try {
    const [customerCode, invoiceNumber, installment] = String(request.params.id).split("-");

    if (!customerCode || !invoiceNumber || !installment) {
      response.status(400).json({ message: "Identificador de boleto invalido." });
      return;
    }

    const pool = await getOraclePool();
    const connection = await pool.getConnection();

    try {
      const result = await connection.execute<{
        ID: string;
        CUSTOMER_CODE: string;
        INVOICE_NUMBER: string;
        INSTALLMENT: string;
        BARCODE?: string | null;
        NOSSO_NUMERO?: string | null;
        BOLETO_FILE_NAME?: string | null;
        BOLETO_FILE_PATH?: string | null;
      }>(
        `
          SELECT
            TO_CHAR(p.codcli) || '-' || TO_CHAR(p.duplic) || '-' || TO_CHAR(p.prest) AS id,
            TO_CHAR(p.codcli) AS customer_code,
            TO_CHAR(p.duplic) AS invoice_number,
            TO_CHAR(p.prest) AS installment,
            p.codbarra AS barcode,
            p.nossonumbco AS nosso_numero,
            p.boleto AS boleto_file_name,
            p.pastaarquivoboleto AS boleto_file_path
          FROM pcprest p
          WHERE TO_CHAR(p.codcli) = :customerCode
            AND TO_CHAR(p.duplic) = :invoiceNumber
            AND TO_CHAR(p.prest) = :installment
          FETCH FIRST 1 ROWS ONLY
        `,
        { customerCode, invoiceNumber, installment },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const row = result.rows?.[0];

      if (!row) {
        response.status(404).json({ message: "Boleto nao encontrado." });
        return;
      }

      const pdfPath = resolveBoletoPdfPath({
        id: row.ID,
        customerCode: row.CUSTOMER_CODE,
        invoiceNumber: row.INVOICE_NUMBER,
        installment: row.INSTALLMENT,
        barcode: row.BARCODE,
        nossoNumero: row.NOSSO_NUMERO,
        boletoFileName: row.BOLETO_FILE_NAME,
        boletoFilePath: row.BOLETO_FILE_PATH
      });

      if (!pdfPath) {
        response.status(404).json({ message: "PDF do boleto nao localizado na pasta configurada." });
        return;
      }

      response.type("application/pdf");
      response.sendFile(pdfPath);
    } finally {
      await connection.close();
    }
  } catch (error) {
    next(error);
  }
});
