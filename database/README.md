# Banco de dados

O CRM usa o PostgreSQL do Supabase.

1. No Supabase, abra o SQL Editor e execute [schema.sql](../schema.sql).
2. Em seguida execute [002_supabase_whatsapp_webhook.sql](002_supabase_whatsapp_webhook.sql).
3. No backend, preencha `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` conforme [backend/.env.example](../backend/.env.example).

A segunda etapa cria a função atômica usada pelo webhook e evita mensagens duplicadas quando a Meta reenvia um evento.
