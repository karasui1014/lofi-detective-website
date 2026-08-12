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
    /* クエリを付けて、古いキャッシュの見出しと一致しないようにする */
    location.href = "./index.html?fresh=" + Date.now();
  });

  document.getElementById("btn-wipe").addEventListener("click", () => {
    if (!confirm("保存した作品をすべて消します。元に戻せません。よろしいですか？")) return;
    localStorage.removeItem("seedance_koubou_v1");
    say("保存した作品をすべて消しました。");
  });

  run();
})();
