import { createServer } from "node:http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";

import { env } from "./config/env.js";
import { apiRouter } from "./routes/api.js";
import { webhookRouter } from "./routes/webhook.js";

const app = express();

app.set("trust proxy", 1);

/**
 * CORS
 */
const allowedOrigins = [
  "https://snow-duck-110419.hostingersite.com",
  "https://papayawhip-wren-243126.hostingersite.com",
  env.FRONTEND_URL?.replace(/\/$/, ""),
].filter(Boolean);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    console.log("🌐 CORS Origin:", origin);

    // Permite requisições sem Origin
    // Ex.: Postman, webhooks e servidor-servidor
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.error("❌ Origem bloqueada pelo CORS:", origin);

    return callback(
      new Error(`Origem não permitida pelo CORS: ${origin}`)
    );
  },

  credentials: true,

  methods: [
    "GET",
    "HEAD",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Authorization",
    "Content-Type",
    "X-Requested-With",
    "Accept",
  ],

  optionsSuccessStatus: 204,
};

/**
 * CORS global
 */
app.use(cors(corsOptions));

/**
 * Body parsers
 */
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

/**
 * Rotas
 */
app.use(webhookRouter);

app.use("/api", apiRouter);

/**
 * Socket.IO
 */
const server = createServer(app);

export const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  socket.on("conversation:join", (id: string) => {
    socket.join(`conversation:${id}`);
  });
});

/**
 * Error handler
 */
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

/**
 * Servidor local
 */
if (!process.env.VERCEL) {
  server.listen(env.PORT, () => {
    console.log(`Backend disponível na porta ${env.PORT}`);
  });
}

export default app;