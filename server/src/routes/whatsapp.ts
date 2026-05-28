import { Router } from "express";

export const whatsappRouter = Router();

whatsappRouter.post("/webhook", (_request, response) => {
  response.status(501).json({
    message:
      "Integracao WhatsApp ainda nao configurada. Esta rota foi reservada para o provedor escolhido."
  });
});
