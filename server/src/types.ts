export type ReceivableStatus = "open" | "overdue" | "paid";

export type Receivable = {
  id: string;
  customerCode?: string;
  customerName: string;
  document: string;
  branchCode?: string | null;
  branchName?: string | null;
  branchDocument?: string | null;
  invoiceNumber: string;
  installment?: string;
  dueDate: string;
  amount: number;
  paidAmount?: number;
  paymentDate?: string | null;
  status: ReceivableStatus;
  lineDigitavel?: string | null;
  boletoUrl?: string | null;
  pdfBase64?: string | null;
};

export type ReceivablesRepository = {
  findOpenByDocument(document: string): Promise<Receivable[]>;
};
