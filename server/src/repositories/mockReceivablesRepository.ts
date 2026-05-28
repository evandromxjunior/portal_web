import type { Receivable, ReceivablesRepository } from "../types.js";
import { maskDocument, onlyDigits } from "../utils/document.js";

const sampleDocument = "12345678000195";

const sampleReceivables: Receivable[] = [
  {
    id: "mock-1001-1",
    customerCode: "1001",
    customerName: "Cliente Demonstração LTDA",
    document: maskDocument(sampleDocument),
    invoiceNumber: "NF-15420",
    installment: "1",
    dueDate: "2026-05-30",
    amount: 1280.5,
    status: "open",
    lineDigitavel: "00190.00009 01234.567890 12345.678901 1 12340000128050",
    boletoUrl: null,
    pdfBase64: null
  },
  {
    id: "mock-1001-2",
    customerCode: "1001",
    customerName: "Cliente Demonstração LTDA",
    document: maskDocument(sampleDocument),
    invoiceNumber: "NF-15377",
    installment: "2",
    dueDate: "2026-05-10",
    amount: 842.1,
    status: "overdue",
    lineDigitavel: "34191.79001 01043.510047 91020.150008 8 12330000084210",
    boletoUrl: null,
    pdfBase64: null
  }
];

export const mockReceivablesRepository: ReceivablesRepository = {
  async findOpenByDocument(document: string) {
    const normalized = onlyDigits(document);

    if (normalized !== sampleDocument) {
      return [];
    }

    return sampleReceivables;
  }
};
