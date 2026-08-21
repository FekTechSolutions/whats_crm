import { createServer } from "node:http";
import path from "node:path";
import express from "express";
import cors from "cors";
import multer from "multer";
import { Server } from "socket.io";

import { env } from "./config/env.js";
import { apiRouter } from "./routes/api.js";
import { webhookRouter } from "./routes/webhook.js";

const app = express();
// Adicione isto imediatamente APÓS instanciar o `const app = express();`
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://snow-duck-110419.hostingersite.com");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.header(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  // Se a requisição for OPTIONS, responde 200/204 imediatamente sem esperar nada do banco/rotas
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
});
const server = createServer(app);

// Lista dinâmica de origens permitidas
const allowedOrigins = [
  "https://snow-duck-110419.hostingersite.com",
  "https://papayawhip-wren-243126.hostingersite.com",
  env.FRONTEND_URL?.replace(/\/$/, ""), // Remove / do final caso exista
].filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Permite requisições sem origin (como Postman, Webhooks do WhatsApp ou servidor-para-servidor)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Em dev/debug, permite prosseguir ou ajuste para callback(new Error("CORS"))
    }
  },
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type", "X-Requested-With", "Accept"],
  optionsSuccessStatus: 200,
};

app.set("trust proxy", 1);

// 1. Aplica CORS globalmente
app.use(cors(corsOptions));

// Intercepta todas as requisições Preflight OPTIONS e responde 200/204 imediatamente
app.options("*", cors(corsOptions));

// 2. Middlewares de Parsing Globais
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// 3. Rotas da Aplicação
app.use(webhookRouter);
app.use("/api", apiRouter);

// 4. WebSocket (Apenas ativo em ambiente tradicional, inativo em Serverless Vercel)
export const io = new Server(server, {
  cors: corsOptions,
});

io.on("connection", (socket) => {
  socket.on("conversation:join", (id: string) => {
    socket.join(`conversation:${id}`);
  });
});

// 5. Middleware Global de Tratamento de Erros
app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("🔥 Erro capturado no Express:", error);

    return response.status(500).json({
      message: "Erro interno do servidor ao processar a requisição.",
      error: error instanceof Error ? error.message : String(error),
    });
  }
);

// Executa o server.listen apenas se NÃO estiver rodando na Vercel
if (!process.env.VERCEL) {
  server.listen(env.PORT, () => {
    console.log(`Backend disponível na porta ${env.PORT}`);
  });
}

export default app;