// 診断APIを「このサイトの画面から」以外に使わせないための門番。
//
// ■ なぜ要るか（2026-10-26 見直しで追加）
// /api/diagnose と /api/extract-outfit は、届いた画像をそのままGeminiへ送る。
// 以前は誰がどこから何MB送っても通していたので、URLを知った人がスクリプトで
// 叩き続けると、こちらのGeminiの利用枠と料金がその分だけ消えていく。
// ここで「同じサイトの画面から来た要求か」「大きさは常識の範囲か」だけを見る。
//
// ■ これで防げること・防げないこと
// 防げる : 他サイトやスクリプトからの素朴な叩き込み、巨大な画像の投げ込み
// 防げない: ヘッダーを偽装してまで叩く相手。そこは Cloudflare のレート制限と
//           Google AI Studio 側の利用上限で受け止める（README参照）

// 画像（Base64）の上限文字数。画面側は送る前にJPEGへ縮小しているので、
// ふつうは数十万文字で収まる。4MB相当を超えるものは使い方として想定外
export const MAX_IMAGE_CHARS = 4_000_000;

// 送り元のホスト名が、このAPIのホストと同じサイトかどうか。
// プレビュー配信（<id>.ai-stylist-1nz.pages.dev）も同じサイトとみなす。
function sameSite(selfHost, otherHost) {
  if (!otherHost) return false;
  if (otherHost === selfHost) return true;
  const tail = (h) => h.split(".").slice(-3).join(".");
  return selfHost.endsWith(".pages.dev") && tail(otherHost) === tail(selfHost);
}

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

// 要求が通せないときはその理由の Response を返し、通せるときは null を返す
export function rejectUnlessAllowed(request, imageBase64) {
  const selfHost = hostOf(request.url);
  const from = request.headers.get("Origin") || request.headers.get("Referer") || "";
  if (!sameSite(selfHost, hostOf(from))) {
    return new Response(
      JSON.stringify({ error: "このAPIはスタイリストの画面からだけ使えます。" }),
      { status: 403, headers: { "content-type": "application/json; charset=utf-8" } }
    );
  }
  if (typeof imageBase64 === "string" && imageBase64.length > MAX_IMAGE_CHARS) {
    return new Response(
      JSON.stringify({ error: "画像が大きすぎます。もう少し小さい画像でお試しください。" }),
      { status: 413, headers: { "content-type": "application/json; charset=utf-8" } }
    );
  }
  return null;
}
