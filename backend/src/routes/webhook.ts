import { createHmac, timingSafeEqual } from "node:crypto";
import { Router, raw } from "express";
import { env } from "../config/env.js";
import { persistWebhookEvents } from "../services/webhook-events.js";

export const webhookRouter = Router();

webhookRouter.get("/webhooks/whatsapp", (request, response) => {
  const { "hub.mode": mode, "hub.verify_token": token, "hub.challenge": challenge } = request.query;
  if (mode === "subscribe" && typeof token === "string" && token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN && typeof challenge === "string") return response.type("text/plain").status(200).send(challenge);
  return response.sendStatus(403);
});

webhookRouter.post("/webhooks/whatsapp", raw({ type: "application/json" }), async (request, response, next) => {
  const signature = request.header("x-hub-signature-256");
  const body = request.body as Buffer;
  const expected = `sha256=${createHmac("sha256", env.META_APP_SECRET).update(body).digest("hex")}`;
  if (!signature || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return response.sendStatus(403);
  try {
    await persistWebhookEvents(JSON.parse(body.toString("utf8")));
    return response.status(200).send("EVENT_RECEIVED");
  } catch (error) { return next(error); }
});
