import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/equipe")({ component: TeamPage });

type ProfileRow = { id: string; full_name: string; email: string | null; phone: string | null; avatar_url: string | null; department_id: string | null; is_active: boolean };
type Department = { id: string; name: string };
type UserRole = { user_id: string; role: "admin" | "supervisor" | "atendente" };

async function fetchTeam() {
  const [profiles, departments, roles] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, phone, avatar_url, department_id, is_active").order("full_name"),
    supabase.from("departments").select("id, name").order("name"),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  if (profiles.error) throw profiles.error;
  if (departments.error) throw departments.error;
  if (roles.error) throw roles.error;
  return { profiles: profiles.data as ProfileRow[], departments: departments.data as Department[], roles: roles.data as UserRole[] };
}

function TeamPage() {
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["team"], queryFn: fetchTeam });
  const [editing, setEditing] = useState<ProfileRow | null>(null);
  const [form, setForm] = useState({ full_name: "", phone: "", avatar_url: "", department_id: "none", is_active: true });
  const canManage = hasRole("admin");

  const save = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const canEditTarget = canManage || editing.id === user?.id;
      if (!canEditTarget) throw new Error("Você não tem permissão para editar este perfil.");
      const payload = {
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        avatar_url: form.avatar_url.trim() || null,
        ...(canManage ? { department_id: form.department_id === "none" ? null : form.department_id, is_active: form.is_active } : {}),
      };
      if (!payload.full_name) throw new Error("Informe o nome do usuário.");
      const { error } = await supabase.from("profiles").update(payload).eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Perfil atualizado."); setEditing(null); queryClient.invalidateQueries({ queryKey: ["team"] }); },
    onError: (error: Error) => toast.error(error.message),
  });

  function openEdit(profile: ProfileRow) {
    setEditing(profile);
    setForm({ full_name: profile.full_name, phone: profile.phone ?? "", avatar_url: profile.avatar_url ?? "", department_id: profile.department_id ?? "none", is_active: profile.is_active });
  }

  const departmentNames = new Map((data?.departments ?? []).map((department) => [department.id, department.name]));
  const rolesByUser = new Map((data?.roles ?? []).map((role) => [role.user_id, role.role]));
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-semibold tracking-tight">Equipe</h1><p className="text-sm text-muted-foreground">Perfis, departamentos e acesso da equipe de atendimento.</p></div>
    <div className="surface-card overflow-hidden">
      {isLoading ? <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, index) => <Skeleton className="h-16 w-full" key={index} />)}</div> : <div className="divide-y">{(data?.profiles ?? []).map((profile) => {
        const initials = profile.full_name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "U";
        const role = rolesByUser.get(profile.id) ?? "atendente";
        return <div className="flex flex-wrap items-center gap-3 p-4" key={profile.id}><Avatar><AvatarImage src={profile.avatar_url ?? undefined} /><AvatarFallback>{initials}</AvatarFallback></Avatar><div className="min-w-44 flex-1"><p className="font-medium">{profile.full_name || "Sem nome"}</p><p className="text-sm text-muted-foreground">{profile.email || profile.phone || "Sem contato"}</p></div><p className="text-sm text-muted-foreground">{profile.department_id ? departmentNames.get(profile.department_id) : "Sem departamento"}</p><Badge variant={profile.is_active ? "default" : "secondary"}>{profile.is_active ? "Ativo" : "Inativo"}</Badge><Badge variant="outline" className="capitalize">{role}</Badge>{(canManage || profile.id === user?.id) && <Button variant="ghost" size="icon" onClick={() => openEdit(profile)} aria-label="Editar perfil"><Pencil className="h-4 w-4" /></Button>}</div>;
      })}{!data?.profiles.length && <div className="p-12 text-center text-sm text-muted-foreground"><Users className="mx-auto mb-3 h-8 w-8" />Nenhum perfil encontrado.</div>}</div>}
    </div>
    <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}><DialogContent><DialogHeader><DialogTitle>Editar perfil</DialogTitle><DialogDescription>Atualize os dados do membro da equipe.</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label htmlFor="full_name">Nome</Label><Input id="full_name" value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} /></div><div className="space-y-2"><Label htmlFor="phone">Telefone</Label><Input id="phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></div><div className="space-y-2"><Label htmlFor="avatar_url">URL do avatar</Label><Input id="avatar_url" type="url" value={form.avatar_url} onChange={(event) => setForm({ ...form, avatar_url: event.target.value })} /></div>{canManage && <><div className="space-y-2"><Label>Departamento</Label><Select value={form.department_id} onValueChange={(department_id) => setForm({ ...form, department_id })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem departamento</SelectItem>{(data?.departments ?? []).map((department) => <SelectItem value={department.id} key={department.id}>{department.name}</SelectItem>)}</SelectContent></Select></div><div className="flex items-center justify-between rounded-lg border p-3"><div><Label htmlFor="active">Usuário ativo</Label><p className="text-xs text-muted-foreground">Usuários inativos permanecem no histórico.</p></div><Switch id="active" checked={form.is_active} onCheckedChange={(is_active) => setForm({ ...form, is_active })} /></div></>}</div><DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button><Button onClick={() => save.mutate()} disabled={save.isPending}><Check className="mr-1 h-4 w-4" />Salvar</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
