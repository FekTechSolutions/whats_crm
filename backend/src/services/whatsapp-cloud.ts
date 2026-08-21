import axios from "axios";
import { env } from "../config/env.js";

const client = axios.create({
  baseURL: `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}`,
  headers: { 
    Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`, 
    "Content-Type": "application/json" 
  },
  timeout: 15_000,
});

/**
  Garante formato E.164 limpo (ex: 5511999998888)
 */
function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  
  // Se o usuário gravou o número sem o código do Brasil (55), adiciona automaticamente
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = `55${cleaned}`;
  }
  
  return cleaned;
}

export async function sendTextMessage(to: string, body: string) {
  try {
    const formattedPhone = normalizePhoneNumber(to);

    const response = await client.post("/messages", {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedPhone,
      type: "text",
      text: { preview_url: false, body },
    });

    return response.data as { messages?: Array<{ id: string }> };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error(
        "❌ Erro na Meta WhatsApp API:",
        JSON.stringify(error.response?.data || error.message, null, 2)
      );
      
      const metaErrorMessage = 
        error.response?.data?.error?.message || "Erro de comunicação com a API do WhatsApp.";
      
      throw new Error(`WhatsApp API: ${metaErrorMessage}`);
    }

    throw error;
  }
}