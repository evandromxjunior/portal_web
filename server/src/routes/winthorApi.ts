import { Router } from "express";

import { findTotvsCustomersByDocument } from "../services/totvsCustomerService.js";
import { isValidCustomerDocument, onlyDigits } from "../utils/document.js";

export const winthorApiRouter = Router();

winthorApiRouter.get("/customers", async (request, response, next) => {
  try {
    const document = String(request.query.document ?? "");

    if (!isValidCustomerDocument(document)) {
      response.status(400).json({
        message: "Informe um CPF ou CNPJ valido."
      });
      return;
    }

    const customers = await findTotvsCustomersByDocument(document);

    response.json({
      document: onlyDigits(document),
      count: customers.length,
      customers
    });
  } catch (error) {
    next(error);
  }
});
