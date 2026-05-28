import fs from "node:fs";
import path from "node:path";

import { config } from "../config.js";

export type BoletoFileLookup = {
  id: string;
  customerCode?: string;
  invoiceNumber?: string;
  installment?: string;
  barcode?: string | null;
  nossoNumero?: string | null;
  boletoFileName?: string | null;
  boletoFilePath?: string | null;
};

const candidateDirectories = ["", "Boleto", "Boletos", "boletos", "Financeiro", "Relatorios", "Temp"];

function onlySafeFileName(value: string) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "").trim();
}

function normalizeToken(value: string) {
  return value.replace(/\D/g, "");
}

function ensurePdfName(value: string) {
  const safeName = onlySafeFileName(value);
  return safeName.toLowerCase().endsWith(".pdf") ? safeName : `${safeName}.pdf`;
}

function isPdfFile(filePath: string) {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function resolveConfiguredPath(filePath: string) {
  if (!config.boletoFiles.basePath) {
    return null;
  }

  if (path.isAbsolute(filePath)) {
    return filePath;
  }

  return path.join(config.boletoFiles.basePath, filePath);
}

function buildCandidateNames(lookup: BoletoFileLookup) {
  const names = new Set<string>();
  const { customerCode, invoiceNumber, installment, barcode, nossoNumero, boletoFileName } = lookup;

  if (boletoFileName) {
    names.add(ensurePdfName(boletoFileName));
  }

  if (invoiceNumber) {
    names.add(ensurePdfName(invoiceNumber));
  }

  if (customerCode && invoiceNumber) {
    names.add(ensurePdfName(`${customerCode}-${invoiceNumber}`));
  }

  if (customerCode && invoiceNumber && installment) {
    names.add(ensurePdfName(`${customerCode}-${invoiceNumber}-${installment}`));
  }

  if (invoiceNumber && installment) {
    names.add(ensurePdfName(`${invoiceNumber}-${installment}`));
  }

  if (nossoNumero) {
    names.add(ensurePdfName(nossoNumero));
    names.add(ensurePdfName(normalizeToken(nossoNumero)));
  }

  if (barcode) {
    names.add(ensurePdfName(barcode));
  }

  names.add(ensurePdfName(lookup.id));

  return [...names].filter((name) => name !== ".pdf");
}

export function resolveBoletoPdfPath(lookup: BoletoFileLookup) {
  if (!config.boletoFiles.basePath) {
    return null;
  }

  if (lookup.boletoFilePath) {
    const configuredPath = resolveConfiguredPath(lookup.boletoFilePath);

    if (configuredPath && isPdfFile(configuredPath)) {
      return configuredPath;
    }
  }

  for (const directory of candidateDirectories) {
    for (const name of buildCandidateNames(lookup)) {
      const candidatePath = path.join(config.boletoFiles.basePath, directory, name);

      if (isPdfFile(candidatePath)) {
        return candidatePath;
      }
    }
  }

  return null;
}
