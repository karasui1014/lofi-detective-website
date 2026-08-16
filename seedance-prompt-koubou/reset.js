/* ============================================================
   キャッシュのリセット
   このファイルは Service Worker の管理対象に入れないこと。
   （入れると、壊れたキャッシュを直すための道具自体がキャッシュされる）
   ============================================================ */
"use strict";

(function () {
  const log = document.getElementById("log");
  const lines = [];
  function say(t) {
    lines.push(t);
    log.textContent = lines.join("\n");
  }

  async function run() {
    say("リセットを始めます…");

    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        say("見つかった Service Worker: " + regs.length + "件");
        for (const r of regs) {
          await r.unregister();
          say("  → 解除しました: " + (r.scope || ""));
        }
      } else {
        say("この環境には Service Worker がありません（問題ありません）");
      }
    } catch (e) {
      say("Service Worker の解除でエラー: " + e.message);
    }

    try {
      if (window.caches) {
        const keys = await caches.keys();
        say("見つかったキャッシュ: " + (keys.length ? keys.join(", ") : "なし"));
        for (const k of keys) {
          await caches.delete(k);
          say("  → 削除しました: " + k);
        }
      }
    } catch (e) {
      say("キャッシュ削除でエラー: " + e.message);
    }

    /* ここがいちばん大事。
       Service Worker とキャッシュを消しても、ブラウザ自身がファイルを
       10分間ため込んでいる（GitHub Pages が Cache-Control: max-age=600 を返す）。
       そのままでは古い画面が出続けるので、cache:"reload" で取り直して
       ブラウザの持ち物を新しいものに入れ替える。 */
    try {
      say("");
      say("ブラウザがため込んだファイルを取り直します…");
      const res = await fetch("./index.html", { cache: "reload" });
      const html = await res.text();
      const urls = new Set(["./", "./index.html"]);
      const re = /(?:src|href)="([^"]+)"/g;
      let m;
      while ((m = re.exec(html))) {
        const u = m[1];
        if (/^(https?:|data:|#|mailto:)/i.test(u)) continue;   /* 外部と特殊なものは触らない */
        urls.add(u);
      }
      let ok = 0;
      for (const u of urls) {
        try {
          await fetch(u, { cache: "reload" });
          ok++;
        } catch (e) {
          say("  取り直せませんでした: " + u);
        }
      }
      say("  → " + ok + "件を最新に入れ替えました");
    } catch (e) {
      say("取り直しでエラー: " + e.message);
    }

    /* 保存した作品を読める形で確認しておく（消さない） */
    try {
      const raw = localStorage.getItem("seedance_koubou_v1");
      const n = raw ? Object.keys(JSON.parse(raw).projects || {}).length : 0;
      say("保存した作品: " + n + "件（そのまま残します）");
    } catch (e) {
      say("保存データの確認でエラー: " + e.message);
    }

    say("");
    say("完了しました。下の「工房を開き直す」を押してください。");
  }

  document.getElementById("btn-go").addEventListener("click", () => {
    /* クエリを付けて、古いキャッシュの見出しと一致しないようにする。
       中のJS/CSSは上で取り直し済みなので、これで最新の画面が出る。 */
    location.replace("./index.html?fresh=" + Date.now());
  });

  document.getElementById("btn-wipe").addEventListener("click", () => {
    if (!confirm("保存した作品をすべて消します。元に戻せません。よろしいですか？")) return;
    localStorage.removeItem("seedance_koubou_v1");
    say("保存した作品をすべて消しました。");
  });

  run();
})();
