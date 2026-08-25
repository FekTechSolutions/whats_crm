import { createHmac, timingSafeEqual } from "node:crypto";
import { Router, raw } from "express";
import { env } from "../config/env.js";
import { persistWebhookEvents } from "../services/webhook-events.js";

export const webhookRouter = Router();

// 1. Validação GET (Meta Verify Token)
webhookRouter.get("/webhooks/whatsapp", (request, response) => {
  const { "hub.mode": mode, "hub.verify_token": token, "hub.challenge": challenge } = request.query;

  if (mode === "subscribe" && typeof token === "string" && token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN && typeof challenge === "string") {
    return response.type("text/plain").status(200).send(challenge);
  }
  return response.sendStatus(403);
});

// 2. Recebimento POST (Mensagens do Cliente)
webhookRouter.post("/webhooks/whatsapp", raw({ type: "application/json" }), async (request, response) => {
  const signature = request.header("x-hub-signature-256");
  const body = request.body as Buffer;

  // Garante a validação da assinatura de forma segura
  if (!signature || !env.META_APP_SECRET) {
    console.error("❌ Signature ausente ou META_APP_SECRET não configurada.");
    return response.sendStatus(403);
  }

  try {
    const expected = `sha256=${createHmac("sha256", env.META_APP_SECRET).update(body).digest("hex")}`;

    const sigBuffer = Buffer.from(signature);
    const expBuffer = Buffer.from(expected);

    if (sigBuffer.length !== expBuffer.length || !timingSafeEqual(sigBuffer, expBuffer)) {
      console.error("❌ Falha na validação HMAC (Signature Invalida). Verifique a variável META_APP_SECRET.");
      return response.sendStatus(403);
    }
  } catch (err) {
    console.error("🔥 Erro ao validar HMAC:", err);
    return response.sendStatus(403);
  }

  // RESPONDE 200 OK IMEDIATAMENTE À META (Gera o 2º visto cinza/azul na hora)
  response.status(200).send("EVENT_RECEIVED");

  // PROCESSA A GRAVAÇÃO EM SEGUNDO PLANO
  try {
    const payload = JSON.parse(body.toString("utf8"));
    await persistWebhookEvents(payload);
  } catch (error) {
    console.error("🔥 Erro ao processar/persistir evento no banco:", error);
  }
});