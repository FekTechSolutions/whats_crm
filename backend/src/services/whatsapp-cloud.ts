import axios from "axios";
import { env } from "../config/env.js";

const client = axios.create({
  baseURL: `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}`,
  headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
  timeout: 15_000,
});

export async function sendTextMessage(to: string, body: string) {
  const response = await client.post("/messages", {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to.replace(/\D/g, ""),
    type: "text",
    text: { preview_url: false, body },
  });
  return response.data as { messages?: Array<{ id: string }> };
}
