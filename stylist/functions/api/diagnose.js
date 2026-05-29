// Cloudflare Pages Function — POST /api/diagnose
// Runs on-demand (no idle server → no sleep). The API key lives in the
// Cloudflare project's encrypted environment variables, never in the browser.

import { runDiagnosis, ALLOWED_MEDIA } from "../../shared/diagnosis.js";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

export async function onRequestPost(context) {
  const { request, env } = context;

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "リクエストの形式が不正です。" }, 400);
  }

  const { imageBase64, mediaType } = payload || {};
  if (typeof imageBase64 !== "string" || !imageBase64) {
    return json({ error: "画像データがありません。" }, 400);
  }
  if (!ALLOWED_MEDIA.has(mediaType)) {
    return json({ error: "対応していない画像形式です。" }, 400);
  }

  if (!env.GEMINI_API_KEY) {
    return json({ error: "サーバー側でGEMINI_API_KEYが未設定です。" }, 500);
  }

  try {
    const { result } = await runDiagnosis(env.GEMINI_API_KEY, {
      imageBase64,
      mediaType,
      model: env.STYLIST_MODEL,
    });
    return json(result, 200);
  } catch (err) {
    const status = err?.status || 500;
    const known = {
      401: "APIキーが無効です。",
      403: "APIキーの権限が不足しています。",
      429: "リクエストが集中しています。少し待って再試行してください。",
    };
    return json(
      { error: known[status] || err?.message || "サーバー内部エラー" },
      status >= 400 && status < 600 ? status : 500
    );
  }
}
