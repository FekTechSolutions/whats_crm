import axios from "axios";
import { supabase } from "@/integrations/client";

export const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ??
    "https://papayawhip-wren-243126.hostingersite.com/api",
  timeout: 15_000,
});

api.interceptors.request.use(async (config) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }

  return config;
});

export async function sendWhatsAppMessage(
  conversationId: string,
  content: string
) {
  const { data } = await api.post(
    `/conversations/${conversationId}/messages`,
    { content }
  );

  return data;
}