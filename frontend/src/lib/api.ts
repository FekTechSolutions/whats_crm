import axios from "axios";
import { supabase } from "@/integrations/client";

export const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ??
    "https://papayawhip-wren-243126.hostingersite.com",
  timeout: 15_000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("crm_whatsapp_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export type LoginResponse = {
  token: string;
  user: { id: string; email: string; name: string; role: "admin" | "supervisor" | "atendente" };
};

export async function login(email: string, password: string) {
  const { data } = await api.post<LoginResponse>("/auth/login", { email, password });
  localStorage.setItem("crm_whatsapp_token", data.token);
  return data;
}

export function logout() {
  localStorage.removeItem("crm_whatsapp_token");
}

export async function sendWhatsAppMessage(conversationId: string, content: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Sua sessão expirou. Entre novamente.");
  await api.post(`/conversations/${conversationId}/messages`, { content }, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
}
