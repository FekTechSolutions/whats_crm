import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/configuracoes")({ component: SettingsPage });
type Department = { id: string; name: string; description: string | null; created_at: string };

function SettingsPage() {
  const { hasAnyRole } = useAuth();
  const canManage = hasAnyRole(["admin", "supervisor"]);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["departments"], queryFn: async () => {
    const { data, error } = await supabase.from("departments").select("*").order("name");
    if (error) throw error;
    return data as Department[];
  }});
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const save = useMutation({ mutationFn: async () => {
    if (!canManage) throw new Error("Você não tem permissão para alterar departamentos.");
    const payload = { name: form.name.trim(), description: form.description.trim() || null };
    if (!payload.name) throw new Error("Informe o nome do departamento.");
    const result = editing ? await supabase.from("departments").update(payload).eq("id", editing.id) : await supabase.from("departments").insert(payload);
    if (result.error) throw result.error;
  }, onSuccess: () => { toast.success(editing ? "Departamento atualizado." : "Departamento criado."); setOpen(false); setEditing(null); queryClient.invalidateQueries({ queryKey: ["departments"] }); queryClient.invalidateQueries({ queryKey: ["team"] }); }, onError: (error: Error) => toast.error(error.message) });
  const remove = useMutation({ mutationFn: async () => {
    if (!deleting) return;
    const { error } = await supabase.from("departments").delete().eq("id", deleting.id);
    if (error) throw error;
  }, onSuccess: () => { toast.success("Departamento removido."); setDeleting(null); queryClient.invalidateQueries({ queryKey: ["departments"] }); queryClient.invalidateQueries({ queryKey: ["team"] }); }, onError: (error: Error) => toast.error(error.message) });
  const openCreate = () => { setEditing(null); setForm({ name: "", description: "" }); setOpen(true); };
  const openEdit = (department: Department) => { setEditing(department); setForm({ name: department.name, description: department.description ?? "" }); setOpen(true); };
  return <div className="space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold tracking-tight">Configurações</h1><p className="text-sm text-muted-foreground">Organize os departamentos que recebem os atendimentos.</p></div>{canManage && <Button onClick={openCreate}><Plus className="mr-1 h-4 w-4" />Novo departamento</Button>}</div><section className="surface-card overflow-hidden"><div className="border-b p-4"><h2 className="font-semibold">Departamentos</h2><p className="text-sm text-muted-foreground">Usuários e conversas podem ser associados a um departamento.</p></div>{isLoading ? <div className="space-y-3 p-4">{Array.from({ length: 3 }).map((_, index) => <Skeleton className="h-20 w-full" key={index} />)}</div> : <div className="divide-y">{(data ?? []).map((department) => <div className="flex items-center gap-3 p-4" key={department.id}><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Building2 className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="font-medium">{department.name}</p><p className="truncate text-sm text-muted-foreground">{department.description || "Sem descrição"}</p></div><Badge variant="secondary">Desde {new Date(department.created_at).toLocaleDateString("pt-BR")}</Badge>{canManage && <div className="flex"><Button size="icon" variant="ghost" onClick={() => openEdit(department)} aria-label="Editar departamento"><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => setDeleting(department)} aria-label="Remover departamento"><Trash2 className="h-4 w-4 text-destructive" /></Button></div>}</div>)}{!data?.length && <p className="p-10 text-center text-sm text-muted-foreground">Nenhum departamento cadastrado.</p>}</div>}</section><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>{editing ? "Editar departamento" : "Novo departamento"}</DialogTitle><DialogDescription>Defina o setor responsável pelos atendimentos.</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label htmlFor="department_name">Nome</Label><Input id="department_name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div><div className="space-y-2"><Label htmlFor="department_description">Descrição</Label><Textarea id="department_description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div></div><DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar</Button></DialogFooter></DialogContent></Dialog><AlertDialog open={!!deleting} onOpenChange={(value) => !value && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remover departamento?</AlertDialogTitle><AlertDialogDescription>Os usuários e conversas vinculados ficarão sem departamento, conforme definido no banco.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate()} disabled={remove.isPending}>Remover</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>;
}
