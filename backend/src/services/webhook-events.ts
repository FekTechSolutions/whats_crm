import { supabaseAdmin } from "../db/supabase.js";

type MetaPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        contacts?: Array<{ profile?: { name?: string } }>;
        messages?: Array<{ id: string; from: string; type: string; text?: { body?: string } }>;
        statuses?: Array<{ id: string; status: string }>;
      }
    }>
  }>;
};

export async function persistWebhookEvents(payload: MetaPayload) {
  let incomingCount = 0;
  let statusCount = 0;

  for (const entry of payload.entry ?? []) for (const change of entry.changes ?? []) {
    const value = change.value;
    if (!value) continue;

    for (const incoming of value.messages ?? []) {
      incomingCount += 1;
      const { data, error } = await supabaseAdmin.rpc(
        "ingest_whatsapp_message",
        {
          p_whatsapp: incoming.from,
          p_name:
            value.contacts?.[0]?.profile?.name?.trim() ||
            incoming.from,
          p_wa_message_id: incoming.id,
          p_type: normalizeMessageType(incoming.type),
          p_content:
            incoming.text?.body ?? `[${incoming.type}]`,
        }
      );

      if (error) {
        console.error("❌ ERRO NO RPC ingest_whatsapp_message", {
          error,
          incoming,
          rpcParams: {
            p_whatsapp: incoming.from,
            p_name:
              value.contacts?.[0]?.profile?.name?.trim() ||
              incoming.from,
            p_wa_message_id: incoming.id,
            p_type: normalizeMessageType(incoming.type),
            p_content:
              incoming.text?.body ?? `[${incoming.type}]`,
          },
        });

        throw error;
      }

      console.info("✅ RPC ingest_whatsapp_message OK", {
        data,
        whatsapp: incoming.from,
        messageId: incoming.id,
      });
    }

    for (const status of value.statuses ?? []) {
      statusCount += 1;
      const { error } = await supabaseAdmin.from("messages").update({ status: status.status }).eq("wa_message_id", status.id);
      if (error) throw error;
    }
  }

  console.info("WhatsApp webhook event processed", { incomingCount, statusCount });
}

function normalizeMessageType(type: string): "texto" | "imagem" | "documento" | "audio" | "video" | "localizacao" {
  const types = { text: "texto", image: "imagem", document: "documento", audio: "audio", video: "video", location: "localizacao" } as const;
  return types[type as keyof typeof types] ?? "texto";
}
