/* ============================================================
   おかいものメモ — app.js  (Phase 1 / MVP)
   - 買うものリスト CRUD（端末内 localStorage 永続化）
   - 予測入力（学習辞書 catalog ＋ いつものチップ ＋ 単位/単価の自動補完）
   - 売り場順 / 追加順 の表示切替（categories.js）
   - 予算バー・合計金額のリアルタイム概算
   - チェック時のご褒美演出
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 永続化ヘルパー ---------- */
  const KEY = {
    items:    'okaimono.items',
    catalog:  'okaimono.catalog',
    budget:   'okaimono.budget',
    settings: 'okaimono.settings',
  };
  const read = (k, fallback) => {
    try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? fallback : v; }
    catch (e) { return fallback; }
  };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  /* ---------- 状態 ---------- */
  let items    = read(KEY.items, []);
  let catalog  = read(KEY.catalog, null);
  let budget   = read(KEY.budget, null);            // 数値 or null
  let settings = read(KEY.settings, { sort: 'aisle', reward: true });

  const saveItems    = () => write(KEY.items, items);
  const saveCatalog  = () => write(KEY.catalog, catalog);
  const saveBudget   = () => write(KEY.budget, budget);
  const saveSettings = () => write(KEY.settings, settings);

  // 初回：学習辞書を「よく買う定番」でシードしておく（いつものチップが空にならないように）
  if (!catalog) {
    catalog = {};
    const popular = ['牛乳', 'たまご', '食パン', '玉ねぎ', 'にんじん', 'じゃがいも',
                     '豚肉', '鶏肉', 'キャベツ', 'トマト', 'ヨーグルト', 'バナナ',
                     '納豆', '豆腐', 'お米', 'ティッシュ'];
    popular.forEach((name, i) => {
      catalog[name] = { name, category: window.guessCategory(name), count: 1,
                        lastUsed: Date.now() - i * 1000, unit: '', price: null };
    });
    saveCatalog();
  }

  /* ---------- 小道具 ---------- */
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const yen = n => '¥' + Math.round(n).toLocaleString('ja-JP');
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  /* ---------- リスト操作 ---------- */
  function addItem(name, opts = {}) {
    name = String(name || '').trim();
    if (!name) return;
    const known = catalog[name];
    const item = {
      id: uid(),
      name,
      category: opts.category || (known && known.category) || window.guessCategory(name),
      qty: opts.qty != null ? opts.qty : 1,
      unit: opts.unit != null ? opts.unit : (known ? known.unit : '') || '',
      price: opts.price != null ? opts.price : (known ? known.price : null),
      checked: false,
      addedAt: Date.now(),
      order: items.length ? Math.max(...items.map(i => i.order || 0)) + 1 : 0,
    };
    items.push(item);
    learn(item);
    saveItems();
    render();
    return item;
  }

  // 学習：catalog に頻度・最終使用日・単位・単価を記録（次回の予測に使う）
  function learn(item) {
    const rec = catalog[item.name] || { name: item.name, count: 0 };
    rec.category = item.category;
    rec.count = (rec.count || 0) + 1;
    rec.lastUsed = Date.now();
    if (item.unit) rec.unit = item.unit;
    if (item.price != null) rec.price = item.price;
    catalog[item.name] = rec;
    saveCatalog();
  }

  function toggleCheck(id) {
    const it = items.find(i => i.id === id);
    if (!it) return;
    it.checked = !it.checked;
    saveItems();
    render();
    if (it.checked) celebrate();
  }

  function updateItem(id, patch) {
    const it = items.find(i => i.id === id);
    if (!it) return;
    Object.assign(it, patch);
    learn(it);
    saveItems();
    render();
  }

  let lastDeleted = null, lastDeletedIdx = -1;
  function deleteItem(id, { silent } = {}) {
    const idx = items.findIndex(i => i.id === id);
    if (idx < 0) return;
    lastDeleted = items[idx];
    lastDeletedIdx = idx;
    items.splice(idx, 1);
    saveItems();
    render();
    if (!silent) toast('削除しました', { undo: restoreDeleted });
  }
  function restoreDeleted() {
    if (!lastDeleted) return;
    items.splice(Math.min(lastDeletedIdx, items.length), 0, lastDeleted);
    lastDeleted = null;
    saveItems();
    render();
  }

  function moveItem(id, dir) {
    // 追加順モードでの ▲▼ 並べ替え（未完了アイテムの中で入れ替え）
    const visible = items.filter(i => !i.checked).sort((a, b) => (a.order || 0) - (b.order || 0));
    const pos = visible.findIndex(i => i.id === id);
    const swap = visible[pos + dir];
    if (!swap) return;
    const cur = visible[pos];
    const o = cur.order; cur.order = swap.order; swap.order = o;
    saveItems();
    render();
  }

  function clearChecked() {
    items = items.filter(i => !i.checked);
    saveItems();
    render();
  }
  function clearAll() {
    items = [];
    saveItems();
    render();
  }

  /* ---------- 合計・予算 ---------- */
  function lineTotal(it) { return it.price != null ? it.price * (it.qty || 1) : 0; }
  function grandTotal() { return items.reduce((s, it) => s + lineTotal(it), 0); }

  function renderBudget() {
    const total = grandTotal();
    $('#totalAmount').textContent = yen(total);
    const fill = $('#budgetFill');
    const msg = $('#budgetMsg');
    const cap = $('#budgetCap');

    if (!budget || budget <= 0) {
      cap.textContent = '予算未設定';
      fill.style.width = '0%';
      fill.className = 'budget-fill';
      msg.textContent = items.length ? 'タップで予算を設定できます 🎯' : '';
      msg.className = 'budget-msg';
      return;
    }
    cap.textContent = '/ ' + yen(budget);
    const ratio = total / budget;
    fill.style.width = Math.min(100, ratio * 100) + '%';
    if (ratio > 1) {
      fill.className = 'budget-fill over';
      msg.textContent = `予算を ${yen(total - budget)} オーバーしています`;
      msg.className = 'budget-msg over';
    } else if (ratio >= 0.8) {
      fill.className = 'budget-fill warn';
      msg.textContent = `予算まで あと ${yen(budget - total)}`;
      msg.className = 'budget-msg';
    } else {
      fill.className = 'budget-fill';
      msg.textContent = `予算まで あと ${yen(budget - total)}`;
      msg.className = 'budget-msg';
    }
  }

  /* ---------- いつもの（学習チップ） ---------- */
  function renderStaples() {
    const wrap = $('#chips');
    const activeNames = new Set(items.filter(i => !i.checked).map(i => i.name));
    const top = Object.values(catalog)
      .filter(r => !activeNames.has(r.name))
      .sort((a, b) => (b.count - a.count) || (b.lastUsed - a.lastUsed))
      .slice(0, 12);
    if (!top.length) { $('#staples').style.display = 'none'; return; }
    $('#staples').style.display = '';
    wrap.innerHTML = top.map(r =>
      `<button class="chip" data-name="${esc(r.name)}"><span class="plus">＋</span>${esc(r.name)}</button>`
    ).join('');
    $$('.chip', wrap).forEach(b => b.addEventListener('click', () => {
      addItem(b.dataset.name);
      toast(`「${b.dataset.name}」を追加しました`);
    }));
  }

  /* ---------- リスト描画 ---------- */
  function render() {
    renderBudget();
    renderStaples();

    const listEl = $('#list');
    const active = items.filter(i => !i.checked);
    const done = items.filter(i => i.checked);

    // カウント
    $('#counter').textContent = items.length ? `${active.length}コ / 全${items.length}コ` : '';

    if (!items.length) {
      listEl.innerHTML = emptyState();
      return;
    }

    let html = '';
    if (settings.sort === 'aisle') {
      // 売り場順にグループ表示
      window.CATEGORIES.forEach(cat => {
        const group = active.filter(i => i.category === cat.id);
        if (!group.length) return;
        html += groupHead(cat, group.length);
        html += group.map(it => itemRow(it, false)).join('');
      });
    } else {
      // 追加順（▲▼で並べ替え可能）
      const ordered = active.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
      html += ordered.map(it => itemRow(it, true)).join('');
    }

    if (done.length) {
      html += `<div class="done-head">かごに入れた（${done.length}）<button class="clear-done" id="clearDone">クリア</button></div>`;
      html += done.map(it => itemRow(it, false)).join('');
    }

    listEl.innerHTML = html;
    bindRows();
  }

  function groupHead(cat, n) {
    return `<div class="group-head"><span class="dot" style="background:${cat.color}">${cat.emoji}</span>${cat.name}<span class="gcount">${n}</span></div>`;
  }

  function itemRow(it, movable) {
    const cat = window.getCategory(it.category);
    const meta = [];
    if (it.qty && it.qty !== 1 || it.unit) meta.push(`${it.qty || 1}${it.unit || 'コ'}`);
    if (it.price != null) meta.push(`<span class="price">${yen(lineTotal(it))}</span>`);
    const metaHtml = meta.length ? `<div class="item-meta">${meta.join('<span>·</span>')}</div>` : '';
    const move = movable
      ? `<button class="mini-btn" data-up="${it.id}" aria-label="上へ">▲</button><button class="mini-btn" data-down="${it.id}" aria-label="下へ">▼</button>`
      : '';
    return `
    <div class="item ${it.checked ? 'checked' : ''}" data-id="${it.id}">
      <button class="check" data-check="${it.id}" aria-label="${it.checked ? 'チェックを外す' : 'かごに入れる'}" role="checkbox" aria-checked="${it.checked}">
        <svg class="tick" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l5 5L20 6"/></svg>
      </button>
      <div class="item-main" data-edit="${it.id}">
        <div class="item-name">${esc(it.name)}</div>
        ${metaHtml}
      </div>
      <div class="item-side">
        ${move}
        <button class="mini-btn" data-edit="${it.id}" aria-label="編集">✎</button>
        <button class="mini-btn del" data-del="${it.id}" aria-label="削除">🗑</button>
      </div>
    </div>`;
  }

  function emptyState() {
    return `
    <div class="empty">
      <div class="em-mascot">${MASCOT_BIG}</div>
      <h3>リストは空っぽです</h3>
      <p>下の入力欄や「いつもの」から<br>買うものを追加してみましょう♪</p>
    </div>`;
  }

  function bindRows() {
    $$('[data-check]').forEach(b => b.addEventListener('click', () => toggleCheck(b.dataset.check)));
    $$('[data-edit]').forEach(b => b.addEventListener('click', () => openEdit(b.dataset.edit)));
    $$('[data-del]').forEach(b => b.addEventListener('click', () => deleteItem(b.dataset.del)));
    $$('[data-up]').forEach(b => b.addEventListener('click', () => moveItem(b.dataset.up, -1)));
    $$('[data-down]').forEach(b => b.addEventListener('click', () => moveItem(b.dataset.down, 1)));
    const cd = $('#clearDone');
    if (cd) cd.addEventListener('click', clearChecked);
  }

  /* ---------- 予測入力（サジェスト） ---------- */
  const input = $('#addInput');
  const suggestEl = $('#suggest');

  function candidates(q) {
    q = q.trim().toLowerCase();
    const pool = new Map();
    // 学習辞書から
    Object.values(catalog).forEach(r => pool.set(r.name, { name: r.name, category: r.category, count: r.count || 0 }));
    // 種辞書から（未学習の一般語も候補に）
    window.seedItemNames().forEach(s => { if (!pool.has(s.name)) pool.set(s.name, { name: s.name, category: s.category, count: 0 }); });

    let arr = Array.from(pool.values());
    if (q) arr = arr.filter(r => r.name.toLowerCase().includes(q));
    arr.sort((a, b) => {
      // 前方一致を優先 → 頻度
      const ap = a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bp = b.name.toLowerCase().startsWith(q) ? 0 : 1;
      return (ap - bp) || (b.count - a.count) || a.name.localeCompare(b.name, 'ja');
    });
    return arr.slice(0, 7);
  }

  function renderSuggest() {
    const q = input.value.trim();
    const list = candidates(q);
    let html = '';
    const exact = list.some(r => r.name === q);
    if (q && !exact) {
      const cat = window.getCategory(window.guessCategory(q));
      html += `<div class="suggest-item new" data-add="${esc(q)}"><span class="cat-emoji">${cat.emoji}</span><span class="name">「${esc(q)}」</span></div>`;
    }
    html += list.map(r => {
      const cat = window.getCategory(r.category);
      const freq = r.count > 1 ? `<span class="freq">${r.count}回</span>` : '';
      return `<div class="suggest-item" data-add="${esc(r.name)}"><span class="cat-emoji">${cat.emoji}</span><span class="name">${esc(r.name)}</span>${freq}</div>`;
    }).join('');
    suggestEl.innerHTML = html;
    suggestEl.classList.toggle('show', !!html && document.activeElement === input);
    $$('.suggest-item', suggestEl).forEach(el => {
      el.addEventListener('mousedown', e => {        // mousedown：blur より先に発火
        e.preventDefault();
        addItem(el.dataset.add);
        input.value = '';
        renderSuggest();
        toast(`「${el.dataset.add}」を追加しました`);
      });
    });
  }

  input.addEventListener('input', renderSuggest);
  input.addEventListener('focus', renderSuggest);
  input.addEventListener('blur', () => setTimeout(() => suggestEl.classList.remove('show'), 120));

  $('#addForm').addEventListener('submit', e => {
    e.preventDefault();
    const v = input.value.trim();
    if (!v) return;
    addItem(v);
    toast(`「${v}」を追加しました`);
    input.value = '';
    renderSuggest();
    input.focus();
  });

  /* ---------- 編集シート ---------- */
  const modal = $('#modal');
  function openSheet(html) { $('#sheet').innerHTML = html; modal.classList.add('open'); }
  function closeSheet() { modal.classList.remove('open'); }
  $('#modalBg').addEventListener('click', closeSheet);

  function openEdit(id) {
    const it = items.find(i => i.id === id);
    if (!it) return;
    const catOpts = window.CATEGORIES.map(c =>
      `<option value="${c.id}" ${c.id === it.category ? 'selected' : ''}>${c.emoji} ${c.name}</option>`).join('');
    openSheet(`
      <div class="sheet-handle"></div>
      <h2>✎ ${esc(it.name)}</h2>
      <div class="field"><label>品名</label><input id="eName" value="${esc(it.name)}"></div>
      <div class="field"><label>カテゴリ（売り場）</label><select id="eCat">${catOpts}</select></div>
      <div class="field-row3">
        <div class="field"><label>個数</label><input id="eQty" type="number" min="0" step="1" inputmode="numeric" value="${it.qty || 1}"></div>
        <div class="field"><label>単位</label><input id="eUnit" value="${esc(it.unit || '')}" placeholder="コ / g / 本"></div>
        <div class="field"><label>単価（円）</label><input id="ePrice" type="number" min="0" step="1" inputmode="numeric" value="${it.price != null ? it.price : ''}" placeholder="任意"></div>
      </div>
      <div class="sheet-actions">
        <button class="btn btn-ghost" id="eCancel">閉じる</button>
        <button class="btn btn-danger" id="eDelete">削除</button>
        <button class="btn btn-primary" id="eSave">保存</button>
      </div>`);
    $('#eCancel').addEventListener('click', closeSheet);
    $('#eDelete').addEventListener('click', () => { closeSheet(); deleteItem(id); });
    $('#eSave').addEventListener('click', () => {
      const name = $('#eName').value.trim() || it.name;
      const priceVal = $('#ePrice').value.trim();
      updateItem(id, {
        name,
        category: $('#eCat').value,
        qty: Math.max(0, parseInt($('#eQty').value, 10) || 1),
        unit: $('#eUnit').value.trim(),
        price: priceVal === '' ? null : Math.max(0, parseInt(priceVal, 10) || 0),
      });
      closeSheet();
    });
  }

  /* ---------- 設定シート ---------- */
  function openSettings() {
    openSheet(`
      <div class="sheet-handle"></div>
      <h2>⚙️ 設定</h2>
      <div class="field"><label>予算（円）</label>
        <input id="sBudget" type="number" min="0" step="100" inputmode="numeric" value="${budget != null ? budget : ''}" placeholder="例：5000"></div>
      <div class="set-row">
        <div><div class="label">ご褒美アニメ</div><div class="sub">かごに入れた時の演出</div></div>
        <div class="switch ${settings.reward ? 'on' : ''}" id="sReward" role="switch" aria-checked="${settings.reward}"><div class="knob"></div></div>
      </div>
      <div class="set-row">
        <div><div class="label">かご済みをクリア</div><div class="sub">チェックした品を消す</div></div>
        <button class="btn btn-ghost" style="flex:0; padding:0.5rem 1rem;" id="sClearDone">実行</button>
      </div>
      <div class="set-row">
        <div><div class="label">リストを全消去</div><div class="sub">学習した「いつもの」は残ります</div></div>
        <button class="btn btn-danger" style="flex:0; padding:0.5rem 1rem;" id="sClearAll">全消去</button>
      </div>
      <div class="sheet-actions">
        <button class="btn btn-ghost" id="sCancel">閉じる</button>
        <button class="btn btn-primary" id="sSave">保存</button>
      </div>
      <p style="text-align:center; font-size:0.7rem; color:var(--text-soft); margin-top:1rem;">データは端末内にのみ保存されます（ログイン不要・オフライン対応）</p>`);
    const rewardSw = $('#sReward');
    rewardSw.addEventListener('click', () => {
      settings.reward = !settings.reward;
      rewardSw.classList.toggle('on', settings.reward);
      rewardSw.setAttribute('aria-checked', settings.reward);
    });
    $('#sClearDone').addEventListener('click', () => { clearChecked(); toast('かご済みをクリアしました'); });
    $('#sClearAll').addEventListener('click', () => {
      if (confirm('リストを全部消しますか？（「いつもの」候補は残ります）')) { clearAll(); closeSheet(); toast('リストを空にしました'); }
    });
    $('#sCancel').addEventListener('click', closeSheet);
    $('#sSave').addEventListener('click', () => {
      const b = $('#sBudget').value.trim();
      budget = b === '' ? null : Math.max(0, parseInt(b, 10) || 0);
      saveBudget(); saveSettings();
      closeSheet(); render();
      toast('設定を保存しました 🌸');
    });
  }
  $('#settingsBtn').addEventListener('click', openSettings);
  $('#budgetWrap').addEventListener('click', openSettings);

  /* ---------- 表示切替（売り場順 / 追加順） ---------- */
  $$('#sortSeg button').forEach(b => b.addEventListener('click', () => {
    settings.sort = b.dataset.sort;
    saveSettings();
    $$('#sortSeg button').forEach(x => x.classList.toggle('active', x === b));
    render();
  }));
  $(`#sortSeg button[data-sort="${settings.sort}"]`)?.classList.add('active');

  /* ---------- ご褒美演出 ---------- */
  const PRAISE = ['えらい！', 'ナイス♪', 'やったね！', 'グッド！', 'バッチリ✨', 'お見事！'];
  const PRAISE_EM = ['🎉', '🌟', '💮', '🐾', '🎈', '🍓'];
  function celebrate() {
    if (!settings.reward) return;
    const r = $('#reward');
    const i = Math.floor(Math.random() * PRAISE.length);
    r.innerHTML = `<span class="em">${PRAISE_EM[i]}</span><span class="bubble">${PRAISE[i]}</span>`;
    r.classList.remove('show'); void r.offsetWidth; r.classList.add('show');
    confetti();
  }
  function confetti() {
    const wrap = $('#confetti');
    const colors = ['#ff9bb3', '#76d6b0', '#b3a8ec', '#ffd86b', '#8fc8ef'];
    let html = '';
    for (let n = 0; n < 16; n++) {
      const left = Math.random() * 100;
      const delay = Math.random() * 0.25;
      const dur = 0.9 + Math.random() * 0.6;
      const c = colors[n % colors.length];
      html += `<i style="left:${left}%;background:${c};animation-delay:${delay}s;animation-duration:${dur}s"></i>`;
    }
    wrap.innerHTML = html;
    setTimeout(() => { wrap.innerHTML = ''; }, 1500);
  }

  /* ---------- トースト ---------- */
  let toastTimer;
  function toast(msg, opts = {}) {
    const t = $('#toast');
    t.innerHTML = `<span>${esc(msg)}</span>` + (opts.undo ? `<span class="undo" id="toastUndo">もどす</span>` : '');
    t.classList.add('show');
    if (opts.undo) $('#toastUndo').addEventListener('click', () => { opts.undo(); t.classList.remove('show'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), opts.undo ? 4000 : 1800);
  }

  /* ---------- マスコット（空状態の大きい子） ---------- */
  const MASCOT_BIG = `
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <ellipse cx="60" cy="104" rx="34" ry="6" fill="#000" opacity="0.06"/>
      <path d="M30 58h60l-6 40a8 8 0 0 1-8 7H44a8 8 0 0 1-8-7l-6-40z" fill="#ffd9e1" stroke="#ff9bb3" stroke-width="3"/>
      <path d="M24 58h72" stroke="#ff9bb3" stroke-width="4" stroke-linecap="round"/>
      <g>
        <circle cx="48" cy="48" r="15" fill="#fff4ef" stroke="#caa89c" stroke-width="2.5"/>
        <path d="M36 40l-3-9 10 5M60 40l3-9-10 5" fill="#fff4ef" stroke="#caa89c" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="43" cy="48" r="2.2" fill="#6b5560"/><circle cx="53" cy="48" r="2.2" fill="#6b5560"/>
        <path d="M46 53q2 2 4 0" stroke="#6b5560" stroke-width="1.8" stroke-linecap="round" fill="none"/>
        <circle cx="40" cy="52" r="2.4" fill="#ffb3c6" opacity="0.8"/><circle cx="56" cy="52" r="2.4" fill="#ffb3c6" opacity="0.8"/>
      </g>
    </svg>`;

  /* ---------- PWA：Service Worker 登録 ---------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  /* ---------- 起動 ---------- */
  render();
})();
