# CRM WhatsApp

Monorepo para atendimento com a API oficial do WhatsApp Business Cloud API.

## Estrutura

- `frontend/`: React, Vite, TanStack Router, Tailwind e Axios.
- `backend/`: Express, TypeScript, SQL Server, JWT, Socket.IO, upload e webhooks.
- `database/`: scripts de criação do SQL Server.

## Desenvolvimento

1. Copie `backend/.env.example` para `backend/.env` e informe credenciais seguras.
2. Copie `frontend/.env.example` para `frontend/.env`.
3. Execute o script em `database/001_initial_schema.sql` no SQL Server.
4. Instale as dependências com `npm install` na raiz.
5. Em dois terminais, execute `npm run dev:backend` e `npm run dev:frontend`.

## Webhook da Meta

Exponha a porta do backend, não a do Vite:

```powershell
cloudflared tunnel --url http://localhost:3333
```

No painel Meta use `https://SEU-TUNEL.trycloudflare.com/webhooks/whatsapp` como Callback URL e o valor de `WHATSAPP_WEBHOOK_VERIFY_TOKEN` como Verify Token. Em produção, use uma URL HTTPS estável.
