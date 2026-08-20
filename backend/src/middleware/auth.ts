import type { NextFunction, Request, Response } from "express";
import { supabaseAdmin } from "../db/supabase.js";

export type AuthUser = { id: string; role: "admin" | "supervisor" | "atendente"; email: string };
export type AuthenticatedRequest = Request & { user?: AuthUser };

export async function authenticate(request: AuthenticatedRequest, response: Response, next: NextFunction) {
  const token = request.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return response.status(401).json({ message: "Token de acesso ausente." });
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return response.status(401).json({ message: "Token de acesso inválido ou expirado." });
  const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", data.user.id).limit(1);
  request.user = { id: data.user.id, email: data.user.email ?? "", role: (roles?.[0]?.role ?? "atendente") as AuthUser["role"] };
  return next();
}
