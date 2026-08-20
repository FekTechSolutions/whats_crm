import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, MessageSquarePlus, Send, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/client";
import { sendWhatsAppMessage } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/conversas")({ component: ConversationsPage });

type ConversationStatus = "novo" | "em_atendimento" | "aguardando_cliente" | "finalizado";
type Customer = { id: string; name: string; whatsapp: string; company: string | null };
type Department = { id: string; name: string };
type Conversation = {
  id: string;
  customer_id: string;
  department_id: string | null;
  assignee_id: string | null;
  status: ConversationStatus;
  unread_count: number;
  last_message_at: string | null;
  last_message_preview: string | null;
};
type Message = { id: string; content: string | null; direction: "entrada" | "saida"; type: string; created_at: string };

const statusLabel: Record<ConversationStatus, string> = {
  novo: "Novo",
  em_atendimento: "Em atendimento",
  aguardando_cliente: "Aguardando cliente",
  finalizado: "Finalizado",
};

async function fetchWorkspace() {
  const [conversations, customers, departments] = await Promise.all([
    supabase.from("conversations").select("*").order("last_message_at", { ascending: false, nullsFirst: false }),
    supabase.from("customers").select("id, name, whatsapp, company").order("name"),
    supabase.from("departments").select("id, name").order("name"),
  ]);
  if (conversations.error) throw conversations.error;
  if (customers.error) throw customers.error;
  if (departments.error) throw departments.error;
  return {
    conversations: conversations.data as Conversation[],
    customers: customers.data as Customer[],
    departments: departments.data as Department[],
  };
}

function ConversationsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["workspace-conversations"], queryFn: fetchWorkspace });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"todas" | ConversationStatus>("todas");
  const [term, setTerm] = useState("");
  const [draft, setDraft] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState("");
  const [newDepartment, setNewDepartment] = useState("none");

  const selected = data?.conversations.find((conversation) => conversation.id === selectedId) ?? null;
  const customersById = useMemo(
    () => new Map((data?.customers ?? []).map((customer) => [customer.id, customer])),
    [data?.customers],
  );
  const departmentsById = useMemo(
    () => new Map((data?.departments ?? []).map((department) => [department.id, department])),
    [data?.departments],
  );
  const filtered = useMemo(() => {
    const normalized = term.trim().toLowerCase();
    return (data?.conversations ?? []).filter((conversation) => {
      const customer = customersById.get(conversation.customer_id);
      return (
        (filter === "todas" || conversation.status === filter) &&
        (!normalized || `${customer?.name} ${customer?.whatsapp} ${conversation.last_message_preview}`.toLowerCase().includes(normalized))
      );
    });
  }, [data?.conversations, customersById, filter, term]);

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["conversation-messages", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("messages")
        .select("id, content, direction, type, created_at")
        .eq("conversation_id", selected!.id)
        .order("created_at");
      if (error) throw error;
      return rows as Message[];
    },
  });

  const createConversation = useMutation({
    mutationFn: async () => {
      if (!newCustomer) throw new Error("Selecione um cliente.");
      const { data: conversation, error } = await supabase
        .from("conversations")
        .insert({ customer_id: newCustomer, department_id: newDepartment === "none" ? null : newDepartment, assignee_id: user?.id ?? null })
        .select("id")
        .single();
      if (error) throw error;
      return conversation.id;
    },
    onSuccess: (id) => {
      toast.success("Conversa criada.");
      setCreateOpen(false);
      setNewCustomer("");
      setNewDepartment("none");
      setSelectedId(id);
      queryClient.invalidateQueries({ queryKey: ["workspace-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateStatus = useMutation({
    mutationFn: async (status: ConversationStatus) => {
      if (!selected) return;
      const { error } = await supabase
        .from("conversations")
        .update({ status, closed_at: status === "finalizado" ? new Date().toISOString() : null, unread_count: 0 })
        .eq("id", selected.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      const content = draft.trim();
      if (!selected || !content) return;
      await sendWhatsAppMessage(selected.id, content);
    },
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["conversation-messages", selected?.id] });
      queryClient.invalidateQueries({ queryKey: ["workspace-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[38rem] flex-col gap-4 xl:flex-row">
      <section className="surface-card flex w-full shrink-0 flex-col overflow-hidden xl:w-[23rem]">
        <div className="border-b p-4">
          <div className="mb-3 flex items-center justify-between">
            <div><h1 className="text-lg font-semibold">Conversas</h1><p className="text-xs text-muted-foreground">Atendimento WhatsApp</p></div>
            <Button size="icon" onClick={() => setCreateOpen(true)} aria-label="Nova conversa"><MessageSquarePlus className="h-4 w-4" /></Button>
          </div>
          <Input placeholder="Buscar conversa" value={term} onChange={(event) => setTerm(event.target.value)} />
          <Select value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
            <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="todas">Todas as conversas</SelectItem>{Object.entries(statusLabel).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <ScrollArea className="flex-1">
          {isLoading ? <div className="space-y-3 p-4">{Array.from({ length: 6 }).map((_, index) => <Skeleton className="h-16 w-full" key={index} />)}</div> : filtered.map((conversation) => {
            const customer = customersById.get(conversation.customer_id);
            return <button key={conversation.id} onClick={() => setSelectedId(conversation.id)} className={`block w-full border-b p-4 text-left hover:bg-accent/60 ${selectedId === conversation.id ? "bg-accent" : ""}`}>
              <div className="flex items-center justify-between gap-3"><span className="truncate text-sm font-medium">{customer?.name ?? "Cliente"}</span><Badge variant="outline" className="shrink-0 text-[10px]">{statusLabel[conversation.status]}</Badge></div>
              <p className="mt-1 truncate text-xs text-muted-foreground">{conversation.last_message_preview || customer?.whatsapp || "Sem mensagens"}</p>
            </button>;
          })}
          {!isLoading && !filtered.length && <p className="p-8 text-center text-sm text-muted-foreground">Nenhuma conversa encontrada.</p>}
        </ScrollArea>
      </section>

      <section className="surface-card flex min-w-0 flex-1 flex-col overflow-hidden">
        {!selected ? <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-muted-foreground"><UserRound className="h-10 w-10" /><p className="text-sm">Selecione ou crie uma conversa para iniciar o atendimento.</p></div> : <>
          <header className="flex flex-wrap items-center gap-3 border-b p-4">
            <div className="min-w-0 flex-1"><h2 className="truncate font-semibold">{customersById.get(selected.customer_id)?.name}</h2><p className="text-xs text-muted-foreground">{customersById.get(selected.customer_id)?.whatsapp} · {selected.department_id ? departmentsById.get(selected.department_id)?.name : "Sem departamento"}</p></div>
            <Select value={selected.status} onValueChange={(value) => updateStatus.mutate(value as ConversationStatus)}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(statusLabel).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
          </header>
          <ScrollArea className="flex-1 bg-muted/20 p-4">
            {messagesLoading ? <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <Skeleton className="h-14 w-2/3" key={index} />)}</div> : <div className="space-y-3">{(messages ?? []).map((message) => <div key={message.id} className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${message.direction === "saida" ? "ml-auto bg-primary text-primary-foreground" : "bg-card shadow-sm"}`}><p>{message.content || `[${message.type}]`}</p><p className="mt-1 text-[10px] opacity-70">{new Date(message.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p></div>)}{!messages?.length && <p className="py-10 text-center text-sm text-muted-foreground">Ainda não há mensagens nesta conversa.</p>}</div>}
          </ScrollArea>
          <form className="flex gap-2 border-t p-3" onSubmit={(event) => { event.preventDefault(); sendMessage.mutate(); }}><Textarea rows={1} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Digite uma mensagem" disabled={selected.status === "finalizado"} /><Button type="submit" size="icon" disabled={!draft.trim() || sendMessage.isPending || selected.status === "finalizado"}><Send className="h-4 w-4" /></Button></form>
        </>}
      </section>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent><DialogHeader><DialogTitle>Nova conversa</DialogTitle><DialogDescription>Abra um novo atendimento para um cliente cadastrado.</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label>Cliente</Label><Select value={newCustomer} onValueChange={setNewCustomer}><SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger><SelectContent>{(data?.customers ?? []).map((customer) => <SelectItem value={customer.id} key={customer.id}>{customer.name} · {customer.whatsapp}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Departamento</Label><Select value={newDepartment} onValueChange={setNewDepartment}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem departamento</SelectItem>{(data?.departments ?? []).map((department) => <SelectItem value={department.id} key={department.id}>{department.name}</SelectItem>)}</SelectContent></Select></div></div><DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button><Button onClick={() => createConversation.mutate()} disabled={createConversation.isPending}><Check className="mr-1 h-4 w-4" />Criar conversa</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
