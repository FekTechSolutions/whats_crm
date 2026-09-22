import { createHmac, timingSafeEqual } from "node:crypto";
import { Router, raw } from "express";

import { env } from "../config/env.js";
import { persistWebhookEvents } from "../services/webhook-events.js";

export const webhookRouter = Router();

/**
 * =====================================================
 * GET /webhooks/whatsapp
 * Validação do webhook pela Meta
 * =====================================================
 */

webhookRouter.get("/whatsapp", (request, response) => {
  const {
    "hub.mode": mode,
    "hub.verify_token": token,
    "hub.challenge": challenge,
  } = request.query;

  console.info("WhatsApp webhook verification requested", {
    mode,
    hasToken: typeof token === "string",
    hasChallenge: typeof challenge === "string",
  });

  if (
    mode === "subscribe" &&
    typeof token === "string" &&
    token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN &&
    typeof challenge === "string"
  ) {
    return response
      .type("text/plain")
      .status(200)
      .send(challenge);
  }

  return response.sendStatus(403);
});

/**
 * =====================================================
 * POST /webhooks/whatsapp
 * Recebimento de eventos da Meta
 * =====================================================
 */

webhookRouter.post(
  "/whatsapp",
  raw({ type: "application/json" }),
  async (request, response) => {
    const signature = request.header("x-hub-signature-256");

    const body = request.body as Buffer;

    console.info("WhatsApp webhook received", {
      contentType: request.header("content-type"),
      hasSignature: Boolean(signature),
      bodySize: Buffer.isBuffer(body) ? body.length : 0,
    });

    /**
     * Garantir que o body seja realmente Buffer
     */
    if (!Buffer.isBuffer(body)) {
      console.error(
        "❌ Webhook request body was not received as raw bytes."
      );

      return response.sendStatus(400);
    }

    /**
     * Validar configuração
     */
    if (!signature || !env.META_APP_SECRET) {
      console.error(
        "❌ Signature ausente ou META_APP_SECRET não configurada."
      );

      return response.sendStatus(403);
    }

    /**
     * =================================================
     * VALIDAÇÃO HMAC
     * =================================================
     */

    try {
      const expected =
        `sha256=${
          createHmac("sha256", env.META_APP_SECRET)
            .update(body)
            .digest("hex")
        }`;

      const sigBuffer = Buffer.from(signature, "utf8");
      const expBuffer = Buffer.from(expected, "utf8");

      if (
        sigBuffer.length !== expBuffer.length ||
        !timingSafeEqual(sigBuffer, expBuffer)
      ) {
        console.error(
          "❌ Falha na validação HMAC."
        );

        return response.sendStatus(403);
      }

      console.info("✅ Assinatura HMAC válida.");
    } catch (error) {
      console.error(
        "🔥 Erro ao validar HMAC:",
        error
      );

      return response.sendStatus(403);
    }

    /**
     * =================================================
     * PROCESSAMENTO
     * =================================================
     */

    try {
      const payload = JSON.parse(
        body.toString("utf8")
      );

      console.info(
        "📩 Evento WhatsApp recebido:",
        JSON.stringify(payload)
      );

      await persistWebhookEvents(payload);

      console.info(
        "✅ WhatsApp webhook persisted successfully"
      );

      return response
        .status(200)
        .send("EVENT_RECEIVED");
    } catch (error) {
      console.error(
        "🔥 Erro ao processar/persistir evento no banco:",
        error
      );

      return response.sendStatus(500);
    }
  }
);