import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../db/supabase.js";
import { authenticate, type AuthenticatedRequest } from "../middleware/auth.js";
import { sendTextMessage } from "../services/whatsapp-cloud.js";

export const apiRouter = Router();
const messageSchema = z.object({ content: z.string().trim().min(1).max(4096) });

apiRouter.get("/health", async (_request, response, next) => {
  try {
    const { error } = await supabaseAdmin.from("profiles").select("id", { head: true, count: "exact" }).limit(1);
    if (error) throw error;
    return response.json({ status: "ok" });
  } catch (error) { return next(error); }
});

apiRouter.post("/conversations/:conversationId/messages", authenticate, async (request: AuthenticatedRequest, response, next) => {
  try {
    const input = messageSchema.parse(request.body);
    const { data: row, error: conversationError } = await supabaseAdmin
      .from("conversations")
      .select("id, customers!inner(whatsapp)")
      .eq("id", request.params.conversationId)
      .maybeSingle();
    if (conversationError) throw conversationError;
    if (!row) return response.status(404).json({ message: "Conversa não encontrada." });

    const customer = row.customers as unknown as { whatsapp: string };
    const result = await sendTextMessage(customer.whatsapp, input.content);
    const whatsappMessageId = result.messages?.[0]?.id ?? null;
    const { error: messageError } = await supabaseAdmin.from("messages").insert({
      conversation_id: row.id, sender_id: request.user!.id, direction: "saida", type: "texto", content: input.content,
      wa_message_id: whatsappMessageId, status: "sent",
    });
    if (messageError) throw messageError;
    const { error: updateError } = await supabaseAdmin.from("conversations").update({
      status: "em_atendimento", last_message_at: new Date().toISOString(), last_message_preview: input.content,
    }).eq("id", row.id);
    if (updateError) throw updateError;
    return response.status(201).json({ whatsappMessageId });
  } catch (error) { return next(error); }
});
