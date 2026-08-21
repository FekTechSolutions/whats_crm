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
const server = createServer(app);

const allowedOrigins = [
  env.FRONTEND_URL,
  "https://snow-duck-110419.hostingersite.com",
  "https://papayawhip-wren-243126.hostingersite.com",
];

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"],
  optionsSuccessStatus: 200,
};

app.set("trust proxy", 1);
app.use(cors(corsOptions));

// 2. Middlewares de Parsing Globais (DEVEM ficar ANTES de apiRouter)
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// 3. Rotas
app.use(webhookRouter);
app.use("/api", apiRouter);

// 4. WebSocket
export const io = new Server(server, {
  cors: corsOptions,
});

io.on("connection", (socket) => {
  socket.on("conversation:join", (id: string) => {
    socket.join(`conversation:${id}`);
  });
});

// 5. Middleware Global de Tratamento de Erros (Evita Crash 503)
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
      error: error instanceof Error ? error.message : String(error)
    });
  }
);

server.listen(env.PORT, () => {
  console.log(`Backend disponível na porta ${env.PORT}`);
});
