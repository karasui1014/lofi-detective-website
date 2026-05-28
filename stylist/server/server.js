// Local development server (no sleep concerns — production runs on Cloudflare
// Pages Functions instead; see ../functions/api/). This serves the static
// frontend and mirrors the production /api/diagnose using the SAME shared logic.
//
// Run:  cp .env.example .env  (fill in the key)  &&  npm start

import { createServer } from "node:http";
import { readFile, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize, extname } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { runDiagnosis, ALLOWED_MEDIA, MODEL_DEFAULT } from "../shared/diagnosis.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC_DIR = join(ROOT, "public");

// --- minimal .env loader (reads stylist/.env, no dependency) -------------
(function loadEnv() {
  const envPath = join(ROOT, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
})();

const PORT = process.env.PORT || 3000;
const MAX_BODY_BYTES = 12 * 1024 * 1024;

let client = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    const e = new Error("ANTHROPIC_API_KEY が設定されていません。stylist/.env に設定してください。");
    e.statusCode = 500;
    throw e;
  }
  if (!client) client = new Anthropic();
  return client;
}

// --- HTTP helpers ---------------------------------------------------------
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
};

function sendJson(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error("画像サイズが大きすぎます。"), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = normalize(join(PUBLIC_DIR, urlPath));
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); res.end("Forbidden"); return; }
  readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); res.end("Not found"); return; }
    res.writeHead(200, { "Content-Type": MIME[extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
}

const server = createServer(async (req, res) => {
  const path = (req.url || "").split("?")[0];

  if (req.method === "GET" && path === "/api/health") {
    return sendJson(res, 200, { ok: true, hasKey: !!process.env.ANTHROPIC_API_KEY });
  }

  if (req.method === "POST" && path === "/api/diagnose") {
    try {
      const raw = await readBody(req);
      let payload;
      try { payload = JSON.parse(raw); } catch { return sendJson(res, 400, { error: "リクエストの形式が不正です。" }); }
      const { imageBase64, mediaType } = payload || {};
      if (typeof imageBase64 !== "string" || !imageBase64) return sendJson(res, 400, { error: "画像データがありません。" });
      if (!ALLOWED_MEDIA.has(mediaType)) return sendJson(res, 400, { error: "対応していない画像形式です。" });

      const { result, usage } = await runDiagnosis(getClient(), { imageBase64, mediaType, model: process.env.STYLIST_MODEL });
      console.log(`[diagnose] in=${usage.input_tokens} out=${usage.output_tokens} cache_read=${usage.cache_read_input_tokens || 0}`);
      return sendJson(res, 200, result);
    } catch (err) {
      const status = err?.statusCode || err?.status || 500;
      const known = { 401: "APIキーが無効です。", 429: "リクエストが集中しています。少し待って再試行してください。", 413: err.message };
      console.error("[diagnose error]", err?.message || err);
      return sendJson(res, status >= 400 && status < 600 ? status : 500, { error: known[status] || err?.message || "サーバー内部エラー" });
    }
  }

  if (req.method === "GET") return serveStatic(req, res);
  res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Method Not Allowed");
});

server.listen(PORT, () => {
  console.log(`stylist dev server: http://localhost:${PORT}  (model: ${process.env.STYLIST_MODEL || MODEL_DEFAULT})`);
  if (!process.env.ANTHROPIC_API_KEY) console.warn("⚠ ANTHROPIC_API_KEY 未設定 — /api/diagnose は失敗します（stylist/.env に設定）。");
});
