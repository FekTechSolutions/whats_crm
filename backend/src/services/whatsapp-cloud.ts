import axios from "axios";
import { env } from "../config/env.js";

const client = axios.create({
  baseURL: `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}`,
  headers: {
    Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  },
  timeout: 15_000,
});

function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");

  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = `55${cleaned}`;
  }

  return cleaned;
}

export async function sendTextMessage(to: string, body: string) {
  try {
    const formattedPhone = normalizePhoneNumber(to);

    console.log("========================================");
    console.log("📱 WHATSAPP CONFIG");
    console.log("API VERSION:", env.WHATSAPP_API_VERSION);
    console.log("PHONE NUMBER ID:", env.WHATSAPP_PHONE_NUMBER_ID);
    console.log("DESTINO:", formattedPhone);
    console.log("========================================");

    // TESTE 1 - verifica se o token consegue acessar o Phone Number
    const phoneResponse = await client.get("");

    console.log(
      "✅ PHONE NUMBER ENCONTRADO:",
      JSON.stringify(phoneResponse.data, null, 2)
    );

    // TESTE 2 - envia mensagem
    const response = await client.post("/messages", {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedPhone,
      type: "text",
      text: {
        preview_url: false,
        body,
      },
    });

    console.log(
      "✅ MENSAGEM ENVIADA:",
      JSON.stringify(response.data, null, 2)
    );

    return response.data as {
      messages?: Array<{ id: string }>;
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error(
        "❌ ERRO META:",
        JSON.stringify(error.response?.data || error.message, null, 2)
      );

      const metaError = error.response?.data?.error;

      throw new Error(
        `WhatsApp API: ${metaError?.message || error.message}`
      );
    }

    throw error;
  }
}