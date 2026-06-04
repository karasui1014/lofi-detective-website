// Cloudflare Pages Function — GET /api/health (quick "is the key wired up?" check)
export function onRequestGet(context) {
  return new Response(
    JSON.stringify({ ok: true, hasKey: !!context.env.ANTHROPIC_API_KEY }),
    { headers: { "content-type": "application/json; charset=utf-8" } }
  );
}
