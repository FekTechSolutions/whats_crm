import { supabaseAdmin } from "../db/supabase.js";

type MetaPayload = {
  entry?: Array<{ changes?: Array<{ value?: {
    contacts?: Array<{ profile?: { name?: string } }>;
    messages?: Array<{ id: string; from: string; type: string; text?: { body?: string } }>;
    statuses?: Array<{ id: string; status: string }>;
  } }> }>;
};

export async function persistWebhookEvents(payload: MetaPayload) {
  for (const entry of payload.entry ?? []) for (const change of entry.changes ?? []) {
    const value = change.value;
    if (!value) continue;

    for (const incoming of value.messages ?? []) {
      const { error } = await supabaseAdmin.rpc("ingest_whatsapp_message", {
        p_whatsapp: incoming.from,
        p_name: value.contacts?.[0]?.profile?.name?.trim() || incoming.from,
        p_wa_message_id: incoming.id,
        p_type: normalizeMessageType(incoming.type),
        p_content: incoming.text?.body ?? `[${incoming.type}]`,
      });
      if (error) throw error;
    }

    for (const status of value.statuses ?? []) {
      const { error } = await supabaseAdmin.from("messages").update({ status: status.status }).eq("wa_message_id", status.id);
      if (error) throw error;
    }
  }
}

function normalizeMessageType(type: string): "texto" | "imagem" | "documento" | "audio" | "video" | "localizacao" {
  const types = { text: "texto", image: "imagem", document: "documento", audio: "audio", video: "video", location: "localizacao" } as const;
  return types[type as keyof typeof types] ?? "texto";
}
