#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Clinic pamphlet redesign — PHOTO-BASED, built on the clinic's own materials.
A4 portrait, 4 pages, matching the original booklet's faces 1:1 but:
  1) training sections use the REAL people photos (kids あいうべ faces, chairside)
  2) text drastically reduced → scannable cards / one-line rows
  3) the last page's irrelevant chair photo is replaced with the smile photo + CTA

Photos are cropped from the user's source snapshots in source-photos/crops/.

  python build.py                       → index.html
  FONT_SRC=/tmp/fonts_src python render.py   → clinic-pamphlet.pdf + _preview/
"""

import pathlib

HERE = pathlib.Path(__file__).resolve().parent
PH = "source-photos/crops"   # photo dir (relative to base_url)

# ── palette (matches the clinic's blue + yellow-marker look) ────────────────
INK   = "#2b3a4a"   # body text
NAVY  = "#1f4e79"   # headers
BLUE  = "#5b8fc7"   # accents
LBLUE = "#dbe8f5"   # soft box bg
SOFT  = "#eef4fb"   # page tint
HI    = "#fdf0a0"   # yellow highlighter
GOLD  = "#e8a33d"   # price / emphasis
CORAL = "#e8806b"
WHITE = "#ffffff"
GRAY  = "#6c7a89"

# ── small inline SVG icons ──────────────────────────────────────────────────

def _svg(body, vb="0 0 48 48", cls="ic"):
    return (f'<svg class="{cls}" viewBox="{vb}" xmlns="http://www.w3.org/2000/svg">'
            f'{body}</svg>')

def ic_mouth():
    return _svg(
        f'<circle cx="24" cy="24" r="22" fill="{CORAL}"/>'
        f'<ellipse cx="24" cy="27" rx="12" ry="9" fill="#a83b52"/>'
        f'<ellipse cx="24" cy="29" rx="10" ry="4" fill="#f2a0b0"/>'
        f'<path d="M14 19 Q24 13 34 19" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>')

def ic_nose():
    return _svg(
        f'<circle cx="24" cy="24" r="22" fill="{BLUE}"/>'
        f'<path d="M17 30 Q24 12 31 30" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round"/>'
        f'<circle cx="19" cy="31" r="3" fill="#fff"/><circle cx="29" cy="31" r="3" fill="#fff"/>')

def ic_tongue():
    return _svg(
        f'<circle cx="24" cy="24" r="22" fill="#e98ba6"/>'
        f'<path d="M16 16 Q24 40 32 16" fill="#d85a7a"/>'
        f'<path d="M24 22 L24 33" stroke="#fff" stroke-width="2" stroke-linecap="round"/>')

def ic_posture():
    return _svg(
        f'<circle cx="24" cy="24" r="22" fill="{GOLD}"/>'
        f'<circle cx="24" cy="15" r="5" fill="#fff"/>'
        f'<path d="M24 20 L24 33 M24 24 L17 29 M24 24 L31 29 M24 33 L19 41 M24 33 L29 41" '
        f'stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>')

def ic_swallow():
    return _svg(
        f'<circle cx="24" cy="24" r="22" fill="#9b8bd0"/>'
        f'<path d="M24 13 L24 31" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>'
        f'<path d="M16 25 L24 33 L32 25" stroke="#fff" stroke-width="3.5" fill="none" '
        f'stroke-linecap="round" stroke-linejoin="round"/>')

def ic_root():
    return _svg(
        f'<circle cx="24" cy="24" r="22" fill="{NAVY}"/>'
        f'<path d="M16 16 Q16 10 24 10 Q32 10 32 16 L30 30 Q29 34 27 30 L26 22 '
        f'Q25 20 24 22 Q23 20 22 22 L21 30 Q19 34 18 30 Z" fill="#fff"/>')

def ic_check(color=NAVY):
    return _svg(
        f'<circle cx="24" cy="24" r="22" fill="{color}"/>'
        f'<path d="M14 25 L21 32 L34 17" stroke="#fff" stroke-width="4" fill="none" '
        f'stroke-linecap="round" stroke-linejoin="round"/>')

# ── HTML page builders ──────────────────────────────────────────────────────

def page_cover():
    return f"""
<div class="page cover">
  <div class="cover-top">
    <div class="cv-line1">12<span class="cv-sub">歳までで決まる</span></div>
    <div class="cv-line2">大切なお子様の</div>
    <div class="cv-line3">お口の状態</div>
  </div>
  <div class="cover-photo">
    <img src="{PH}/c_cover.png" alt="お口の検診">
  </div>
  <div class="cover-foot">
    <div class="cv-tag">マイオブレース小児矯正のご案内</div>
    <div class="cv-clinic">［ 医院名 ］　／　予約・お問い合わせ ［ 電話番号 ］</div>
  </div>
</div>"""


def page_why():
    bubbles = ["前歯が出ている", "お口ポカン", "口呼吸", "いびき",
               "くちゃくちゃ食べ", "顎が出ている", "発音異常", "悪習癖"]
    big = {"口呼吸", "顎が出ている"}
    bub_html = "".join(
        f'<span class="bub {"big" if b in big else ""}">{b}</span>' for b in bubbles
    )
    return f"""
<div class="page">
  <div class="hd"><span class="hd-en">CAUSE</span>なぜ歯ならびが悪くなるの？</div>

  <p class="lead">歯ならびが悪くなる原因の <b>95%以上は後天的</b>。毎日の
  「クセ」が顎の発育を妨げます。<b>早期に整える</b>ことが大切です。</p>

  <div class="why-hero">
    <img src="{PH}/c_kids3.png" alt="お口のクセ">
    <div class="why-hero-cap">原因の多くは&nbsp;<b>お口まわりのクセ</b></div>
  </div>

  <div class="cards3">
    <div class="card">{ic_mouth()}<div class="ct">口呼吸</div>
      <div class="cd">口がポカンと開く</div></div>
    <div class="card">{ic_tongue()}<div class="ct">舌のクセ</div>
      <div class="cd">舌が低い位置にある</div></div>
    <div class="card">{ic_posture()}<div class="ct">姿勢のくずれ</div>
      <div class="cd">猫背・気道が狭くなる</div></div>
  </div>

  <div class="why-bottom">
    <img class="why-posture" src="{PH}/c_posture.png" alt="姿勢">
    <div class="why-note">
      <div class="why-note-h">舌・呼吸・姿勢がつながっています</div>
      口呼吸 → 舌が下がる → 顎が育たない、という悪循環に。
      <b>鼻呼吸</b>と<b>正しい舌の位置</b>が健やかな成長のカギです。
    </div>
  </div>

  <div class="worry">
    <div class="worry-h">お子さんの こんな<b>お悩み</b> ありませんか？</div>
    <div class="bubbles">{bub_html}</div>
  </div>
</div>"""


def page_steps():
    steps = [
        ("c_train1.png", "STEP 1", "マイオブレス治療", "4〜10歳・0期",
         "¥286,000", BLUE, "口まわりの筋肉を整え、悪いクセを正すトレーニング。"),
        ("c_train2.png", "STEP 2", "Ⅰ期治療", "7歳〜・混合歯列期",
         "¥440,000", GOLD, "顎の成長をガイドしながら、装置で歯ならびを整える。"),
        ("c_smile.png", "STEP 3", "Ⅱ期治療", "12歳以降・永久歯列期",
         "¥946,000", CORAL, "永久歯が生え揃ってから、最終的な歯列を仕上げる。"),
    ]
    rows = ""
    for img, st, name, age, price, color, desc in steps:
        rows += f"""
    <div class="step">
      <div class="step-ph"><img src="{PH}/{img}" alt="{name}"></div>
      <div class="step-body">
        <div class="step-top">
          <span class="step-badge" style="background:{color}">{st}</span>
          <span class="step-name">{name}</span>
          <span class="step-price" style="color:{color};border-color:{color}">{price}<small>（税込）</small></span>
        </div>
        <div class="step-age">{age}</div>
        <div class="step-desc">{desc}</div>
      </div>
    </div>"""

    flow = [("精密検査", "検査でお口の状態を把握"),
            ("ご説明", "方針・費用・期間を説明"),
            ("治療開始", "装置＋トレーニング"),
            ("保定・メンテ", "後戻りを防いで定期確認")]
    flow_html = ""
    for i, (t, d) in enumerate(flow):
        flow_html += f"""<div class="flow-item"><div class="flow-no">{i+1}</div>
        <div class="flow-t">{t}</div><div class="flow-d">{d}</div></div>"""
        if i < 3:
            flow_html += '<div class="flow-arrow">▶</div>'

    return f"""
<div class="page">
  <div class="hd"><span class="hd-en">TREATMENT</span>3ステップの矯正治療</div>
  <div class="steps">{rows}</div>

  <div class="train-box">
    <div class="train-h">トレーニング内容</div>
    <div class="train-icons">
      <div class="ti">{ic_tongue()}<span>舌と口</span></div>
      <div class="ti">{ic_nose()}<span>呼吸</span></div>
      <div class="ti">{ic_posture()}<span>姿勢</span></div>
    </div>
    <div class="train-note">3つの「機能」を正しく使えるようにすると、顎が自然に育ち歯ならびが改善します。</div>
  </div>

  <div class="flow-h">治療の流れ</div>
  <div class="flow">{flow_html}</div>
</div>"""


def page_what():
    rows = [
        (ic_tongue(), "舌", "正しい位置で上顎を押し広げ、歯列を育てる。"),
        (ic_nose(), "呼吸", "鼻呼吸が、正しいお顔の発育に欠かせない。"),
        (ic_mouth(), "口唇", "唇が自然に閉じることで歯ならびが安定。"),
        (ic_swallow(), "飲み込み", "1日約2000回の嚥下。正しい飲み込みが大切。"),
        (ic_root(), "根本原因", "クセという“根本原因”からアプローチする。"),
    ]
    row_html = ""
    for icon, t, d in rows:
        row_html += f"""<div class="wrow">{icon}
        <div><span class="wrow-t">{t}</span><span class="wrow-d">{d}</span></div></div>"""

    return f"""
<div class="page">
  <div class="hd"><span class="hd-en">ABOUT</span>マイオブレース治療ってどんな治療？</div>

  <p class="lead">乱れた歯ならびは、<b>呼吸・舌・口唇・飲み込み</b>の
  はたらきが整わないことで起こる“結果”。だから根本から育てます。</p>

  <div class="wrows">{row_html}</div>

  <div class="goal">
    <div class="goal-h">{ic_check(NAVY)}治療の目標</div>
    <div class="goal-d">お口の機能を整え、<b>正しい成長</b>へ。
    噛み合わせ・睡眠・姿勢にも良い変化が期待できます。</div>
  </div>

  <!-- 旧版の「椅子の写真」を、ゴールが伝わる笑顔の写真＋ご案内に置き換え -->
  <div class="goal-photo">
    <img src="{PH}/c_smile.png" alt="きれいな歯ならびの笑顔">
    <div class="goal-photo-cap">
      <div class="gp-h">めざすのは、自信あふれる笑顔。</div>
      <div class="gp-d">鼻呼吸で過ごし、唇は自然に閉じ、舌は正しい位置に。<br>
      その「正しい機能」が一生の財産になります。</div>
    </div>
  </div>

  <div class="cta">
    <div class="cta-h">まずは無料カウンセリングへ</div>
    <table class="cta-info">
      <tr><th>医院名</th><td>［ クリニック名 ］</td></tr>
      <tr><th>住所</th><td>［ 住所 ］</td></tr>
      <tr><th>電話</th><td>［ 電話番号 ］</td></tr>
      <tr><th>受付</th><td>月〜土 9:00〜18:00（日・祝休）</td></tr>
    </table>
  </div>

  <div class="legal">※表示価格は税込。別途アクティビティ費等がかかる場合があります。治療効果には個人差があり、
  副作用・リスクはカウンセリング時にご説明します。</div>
</div>"""


# ── CSS ──────────────────────────────────────────────────────────────────────

CSS = f"""
@font-face {{ font-family:R; src:url(fonts/MPLUSRounded1c-Regular.woff2) format('woff2'); font-weight:400; }}
@font-face {{ font-family:R; src:url(fonts/MPLUSRounded1c-Medium.woff2) format('woff2'); font-weight:500; }}
@font-face {{ font-family:R; src:url(fonts/MPLUSRounded1c-Bold.woff2) format('woff2'); font-weight:700; }}
@font-face {{ font-family:Pop; src:url(fonts/MochiyPopOne-Regular.woff2) format('woff2'); }}

@page {{ size: A4 portrait; margin: 0; }}
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ font-family:R, sans-serif; color:{INK}; background:#dde1e6; line-height:1.6; }}

.page {{
  position:relative; width:210mm; height:297mm; overflow:hidden;
  background:{WHITE}; padding:12mm 12mm 9mm;
  print-color-adjust:exact; -webkit-print-color-adjust:exact;
  page-break-after:always;
}}
.ic {{ width:48px; height:48px; flex:0 0 auto; }}

/* headers */
.hd {{ font-family:Pop; font-size:20pt; color:{NAVY}; padding:6px 0 4px;
  border-bottom:3px solid {BLUE}; margin-bottom:10px; }}
.hd-en {{ display:inline-block; font-family:R; font-weight:700; font-size:9pt;
  color:{WHITE}; background:{BLUE}; padding:2px 9px; border-radius:10px;
  margin-right:10px; vertical-align:middle; letter-spacing:.08em; }}
.lead {{ font-size:11pt; background:{SOFT}; border-left:5px solid {BLUE};
  padding:9px 12px; border-radius:0 8px 8px 0; margin-bottom:12px; }}
.lead b {{ color:{NAVY}; background:linear-gradient(transparent 55%, {HI} 55%); }}

/* ── cover ── */
.cover {{ padding:0; }}
.cover-top {{ padding:14mm 14mm 6mm; text-align:center; }}
.cv-line1 {{ font-family:Pop; font-size:46pt; color:{NAVY}; line-height:1; }}
.cv-sub {{ font-size:22pt; }}
.cv-line2 {{ display:inline-block; font-family:Pop; font-size:21pt; color:{WHITE};
  background:{BLUE}; padding:3px 22px; border-radius:6px; margin:8px 0; }}
.cv-line3 {{ font-family:Pop; font-size:48pt; color:{NAVY}; letter-spacing:.06em; }}
.cover-photo {{ position:absolute; top:120mm; left:0; right:0; bottom:26mm; }}
.cover-photo img {{ width:100%; height:100%; object-fit:cover; }}
.cover-foot {{ position:absolute; left:0; right:0; bottom:0; height:26mm;
  background:{NAVY}; color:{WHITE}; text-align:center;
  display:flex; flex-direction:column; justify-content:center; }}
.cv-tag {{ font-size:13pt; font-weight:700; color:{HI}; }}
.cv-clinic {{ font-size:10pt; margin-top:6px; color:{LBLUE}; }}

/* ── why page ── */
.why-hero {{ position:relative; border-radius:12px; overflow:hidden; height:46mm; margin-bottom:12px; }}
.why-hero img {{ width:100%; height:100%; object-fit:cover; object-position:center 35%; }}
.why-hero-cap {{ position:absolute; left:0; bottom:0; right:0; padding:7px 14px;
  background:linear-gradient(transparent, #0008); color:{WHITE}; font-size:13pt; }}
.why-hero-cap b {{ color:{HI}; }}

.cards3 {{ display:flex; gap:10px; margin-bottom:12px; }}
.card {{ flex:1; background:{WHITE}; border:1.5px solid {LBLUE}; border-radius:12px;
  padding:12px 8px; text-align:center; box-shadow:0 2px 6px #0001; }}
.card .ic {{ margin-bottom:6px; }}
.ct {{ font-weight:700; color:{NAVY}; font-size:12.5pt; }}
.cd {{ font-size:9.5pt; color:{GRAY}; }}

.why-bottom {{ display:flex; gap:12px; align-items:stretch; margin-bottom:14px; }}
.why-posture {{ width:62mm; height:38mm; object-fit:cover; border-radius:12px; flex:0 0 auto; }}
.why-note {{ background:{LBLUE}; border-radius:12px; padding:11px 14px; font-size:10pt; }}
.why-note-h {{ font-weight:700; color:{NAVY}; font-size:11.5pt; margin-bottom:4px; }}
.why-note b {{ color:{NAVY}; background:linear-gradient(transparent 55%, {HI} 55%); }}

.worry {{ background:{SOFT}; border-radius:14px; padding:12px 14px; }}
.worry-h {{ font-family:Pop; font-size:14pt; color:{NAVY}; margin-bottom:8px; }}
.worry-h b {{ color:{CORAL}; }}
.bubbles {{ display:flex; flex-wrap:wrap; gap:8px; align-items:center; justify-content:center; }}
.bub {{ display:inline-block; background:{BLUE}; color:{WHITE}; border-radius:18px;
  padding:7px 15px; font-size:10.5pt; font-weight:500; }}
.bub.big {{ background:{NAVY}; font-size:13pt; font-weight:700; padding:10px 20px; }}

/* ── steps page ── */
.steps {{ display:flex; flex-direction:column; gap:9px; margin-bottom:12px; }}
.step {{ display:flex; gap:12px; border:1.5px solid {LBLUE}; border-radius:14px;
  overflow:hidden; background:{WHITE}; box-shadow:0 2px 6px #0001; }}
.step-ph {{ width:52mm; flex:0 0 auto; }}
.step-ph img {{ width:100%; height:100%; object-fit:cover; min-height:30mm; }}
.step-body {{ padding:10px 14px 10px 0; flex:1; }}
.step-top {{ display:flex; align-items:center; gap:9px; flex-wrap:wrap; }}
.step-badge {{ color:{WHITE}; font-weight:700; font-size:9.5pt; padding:3px 10px; border-radius:11px; }}
.step-name {{ font-family:Pop; font-size:15pt; color:{NAVY}; }}
.step-price {{ margin-left:auto; font-weight:700; font-size:14pt; border:2px solid;
  border-radius:8px; padding:1px 9px; }}
.step-price small {{ font-size:7.5pt; font-weight:400; }}
.step-age {{ font-size:9pt; color:{GRAY}; margin:3px 0 4px; }}
.step-desc {{ font-size:10.5pt; }}

.train-box {{ background:{LBLUE}; border-radius:14px; padding:11px 16px; margin-bottom:12px;
  display:grid; grid-template-columns:auto auto 1fr; align-items:center; gap:14px; }}
.train-h {{ font-family:Pop; color:{NAVY}; font-size:12.5pt; writing-mode:horizontal-tb; }}
.train-icons {{ display:flex; gap:16px; }}
.ti {{ text-align:center; font-size:9.5pt; color:{NAVY}; font-weight:700; }}
.ti .ic {{ width:42px; height:42px; display:block; margin:0 auto 2px; }}
.train-note {{ font-size:9.5pt; }}

.flow-h {{ font-family:Pop; color:{WHITE}; background:{NAVY}; display:inline-block;
  padding:4px 16px; border-radius:8px; font-size:13pt; margin-bottom:10px; }}
.flow {{ display:flex; align-items:stretch; gap:4px; }}
.flow-item {{ flex:1; background:{SOFT}; border:1.5px solid {LBLUE}; border-radius:10px;
  padding:9px 6px; text-align:center; }}
.flow-no {{ width:26px; height:26px; line-height:26px; border-radius:50%;
  background:{BLUE}; color:{WHITE}; font-weight:700; margin:0 auto 5px; }}
.flow-t {{ font-weight:700; color:{NAVY}; font-size:10.5pt; }}
.flow-d {{ font-size:8.5pt; color:{GRAY}; margin-top:2px; }}
.flow-arrow {{ display:flex; align-items:center; color:{BLUE}; font-size:11pt; }}

/* ── what page ── */
.wrows {{ display:flex; flex-direction:column; gap:7px; margin-bottom:13px; }}
.wrow {{ display:flex; align-items:center; gap:13px; background:{SOFT};
  border-radius:11px; padding:8px 14px; }}
.wrow .ic {{ width:38px; height:38px; }}
.wrow-t {{ display:inline-block; min-width:74px; font-family:Pop; color:{NAVY};
  font-size:12pt; }}
.wrow-d {{ font-size:10.5pt; }}

.goal {{ background:{LBLUE}; border-radius:12px; padding:11px 16px; margin-bottom:13px; }}
.goal-h {{ display:flex; align-items:center; gap:9px; font-family:Pop; color:{NAVY};
  font-size:13pt; margin-bottom:4px; }}
.goal-h .ic {{ width:30px; height:30px; }}
.goal-d b {{ color:{NAVY}; background:linear-gradient(transparent 55%, {HI} 55%); }}

.goal-photo {{ display:flex; gap:14px; align-items:center; background:{NAVY};
  border-radius:14px; overflow:hidden; margin-bottom:12px; }}
.goal-photo img {{ width:64mm; height:42mm; object-fit:cover; flex:0 0 auto; }}
.goal-photo-cap {{ color:{WHITE}; padding:6px 16px 6px 0; }}
.gp-h {{ font-family:Pop; font-size:14pt; color:{HI}; margin-bottom:5px; }}
.gp-d {{ font-size:10pt; color:{LBLUE}; line-height:1.7; }}

.cta {{ border:2.5px solid {NAVY}; border-radius:14px; padding:12px 16px; margin-bottom:10px; }}
.cta-h {{ font-family:Pop; color:{NAVY}; font-size:14pt; text-align:center; margin-bottom:8px; }}
.cta-info {{ width:100%; border-collapse:collapse; font-size:10.5pt; }}
.cta-info th {{ text-align:left; color:{BLUE}; font-weight:700; width:24%; padding:3px 0; }}
.cta-info td {{ padding:3px 0; }}

.legal {{ font-size:8pt; color:{GRAY}; line-height:1.5; }}

@media screen {{
  body {{ padding:20px; }}
  .page {{ margin:0 auto 22px; box-shadow:0 6px 26px #0004; }}
}}
"""

# ── assemble ────────────────────────────────────────────────────────────────

def build_html():
    pages = page_cover() + page_why() + page_steps() + page_what()
    return f"""<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>マイオブレース小児矯正パンフレット（改訂版・写真ベース）</title>
<style>{CSS}</style></head>
<body>
{pages}
</body></html>
"""

if __name__ == "__main__":
    (HERE / "index.html").write_text(build_html(), encoding="utf-8")
    print("wrote index.html", len(build_html()), "bytes")
