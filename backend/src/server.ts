import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";

import { env } from "./config/env.js";
import { apiRouter } from "./routes/api.js";
import { webhookRouter } from "./routes/webhook.js";

const app = express();

app.set("trust proxy", 1);

/**
 * =====================================================
 * CORS
 * =====================================================
 */

const allowedOrigins = [
  "https://snow-duck-110419.hostingersite.com",
  "https://papayawhip-wren-243126.hostingersite.com",
  env.FRONTEND_URL?.replace(/\/$/, ""),
].filter(Boolean);

console.log("🌐 CORS allowed origins:", allowedOrigins);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    console.log("🌐 Request Origin:", origin);

    // Permite chamadas sem Origin
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.error("❌ CORS bloqueado:", origin);

    return callback(
      new Error(`Origin not allowed by CORS: ${origin}`)
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
 * CORS deve ser o PRIMEIRO middleware
 */
app.use(cors(corsOptions));

/**
 * =====================================================
 * BODY
 * =====================================================
 */

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

/**
 * =====================================================
 * ROUTES
 * =====================================================
 */

app.use(webhookRouter);

app.use("/api", apiRouter);

/**
 * =====================================================
 * ERROR HANDLER
 * =====================================================
 */

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("🔥 Erro capturado pelo Express:", error);

    return response.status(500).json({
      message: "Erro interno do servidor.",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
);

/**
 * =====================================================
 * SOCKET.IO
 * =====================================================
 *
 * Socket.IO funciona apenas no servidor tradicional.
 * Na Vercel Serverless não usamos o listener.
 */

if (!process.env.VERCEL) {
  const server = createServer(app);

  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("🔌 Socket conectado:", socket.id);

    socket.on("conversation:join", (id: string) => {
      socket.join(`conversation:${id}`);
    });
  });

  server.listen(env.PORT, () => {
    console.log(`🚀 Backend disponível na porta ${env.PORT}`);
  });
}

/**
 * =====================================================
 * VERCEL
 * =====================================================
 */

export default app;