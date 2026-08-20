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

const corsOptions = {
  origin: "https://snow-duck-110419.hostingersite.com",
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type"],
  optionsSuccessStatus: 200 // Suporte para navegadores legados e proxies
};

app.set("trust proxy", 1);

// Apenas esta linha já é suficiente para tratar CORS e requisições preflight OPTIONS
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

export const io = new Server(server, {
  cors: {
    origin: "https://snow-duck-110419.hostingersite.com",
    credentials: true,
  },
});

const upload = multer({
  dest: path.resolve("uploads"),
  limits: {
    fileSize: 16 * 1024 * 1024,
  },
});

app.use(webhookRouter);

app.use(express.json({ limit: "1mb" }));

app.use("/api", apiRouter);

app.post(
  "/api/uploads",
  upload.single("file"),
  (request, response) => {
    if (!request.file) {
      return response.status(400).json({
        message: "Arquivo obrigatório.",
      });
    }

    return response.status(201).json({
      filename: request.file.filename,
      originalName: request.file.originalname,
      mimeType: request.file.mimetype,
    });
  }
);

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(error);

    return response.status(500).json({
      message: "Erro interno do servidor.",
    });
  }
);

io.on("connection", (socket) => {
  socket.on("conversation:join", (id: string) => {
    socket.join(`conversation:${id}`);
  });
});

console.log("SERVER.TS FOI CARREGADO");

server.listen(env.PORT, () => {
  console.log(`Backend disponível em http://localhost:${env.PORT}`);
});