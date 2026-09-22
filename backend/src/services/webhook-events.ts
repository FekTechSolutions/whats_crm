import { supabaseAdmin } from "../db/supabase.js";

type MetaPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        contacts?: Array<{ profile?: { name?: string } }>;
        messages?: Array<{
          id: string;
          from: string;
          type: string;
          text?: { body?: string };
          image?: { id: string; caption?: string; mime_type?: string };
          document?: { id: string; filename?: string; caption?: string };
          audio?: { id: string };
          video?: { id: string; caption?: string };
          location?: { latitude: number; longitude: number; name?: string; address?: string };
        }>;
        statuses?: Array<{ id: string; status: string }>;
      };
    }>;
  }>;
};

export async function persistWebhookEvents(payload: MetaPayload) {
  let incomingCount = 0;
  let statusCount = 0;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;

      for (const incoming of value.messages ?? []) {
        incomingCount += 1;

        const normalizedType = normalizeMessageType(incoming.type);
        const contactName = value.contacts?.[0]?.profile?.name?.trim() || incoming.from;
        
        // Extração de conteúdo e mídia
        let content = incoming.text?.body;
        let mediaUrl: string | undefined = undefined;
        let latitude: number | undefined = undefined;
        let longitude: number | undefined = undefined;
        let locationName: string | undefined = undefined;
        let locationAddress: string | undefined = undefined;

        if (incoming.type === "image") {
          content = incoming.image?.caption ?? "[Imagem]";
          mediaUrl = incoming.image?.id; // Guarde o Media ID da Meta
        } else if (incoming.type === "document") {
          content = incoming.document?.caption ?? incoming.document?.filename ?? "[Documento]";
          mediaUrl = incoming.document?.id;
        } else if (incoming.type === "audio") {
          content = "[Áudio]";
          mediaUrl = incoming.audio?.id;
        } else if (incoming.type === "video") {
          content = incoming.video?.caption ?? "[Vídeo]";
          mediaUrl = incoming.video?.id;
        } else if (incoming.type === "location" && incoming.location) {
          content = incoming.location.name ?? incoming.location.address ?? "[Localização]";
          latitude = incoming.location.latitude;
          longitude = incoming.location.longitude;
          locationName = incoming.location.name;
          locationAddress = incoming.location.address;
        }

        // Chamada adaptada à RPC do Supabase
        const { data, error } = await supabaseAdmin.rpc(
          "save_incoming_whatsapp_message",
          {
            p_from_number: incoming.from,
            p_contact_name: contactName,
            p_wa_message_id: incoming.id,
            p_message_type: normalizedType,
            p_content: content ?? `[${incoming.type}]`,
            p_media_url: mediaUrl,
            p_latitude: latitude,
            p_longitude: longitude,
            p_location_name: locationName,
            p_location_address: locationAddress
          }
        );

        if (error) {
          console.error("❌ ERRO NO RPC save_incoming_whatsapp_message", {
            error,
            incoming,
          });
          throw error;
        }

        console.info("✅ RPC OK", {
          data,
          whatsapp: incoming.from,
          messageId: incoming.id,
        });
      }

      for (const status of value.statuses ?? []) {
        statusCount += 1;
        const { error } = await supabaseAdmin
          .from("messages")
          .update({ status: status.status })
          .eq("wa_message_id", status.id);

        if (error) throw error;
      }
    }
  }

  console.info("WhatsApp webhook event processed", { incomingCount, statusCount });
}

function normalizeMessageType(type: string): "texto" | "imagem" | "documento" | "audio" | "video" | "localizacao" {
  const types = {
    text: "texto",
    image: "imagem",
    document: "documento",
    audio: "audio",
    video: "video",
    location: "localizacao",
  } as const;

  return types[type as keyof typeof types] ?? "texto";
}