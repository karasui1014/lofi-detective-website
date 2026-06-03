#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Redesigned clinic pamphlet — A5 trifold (6 panels), print-ready HTML+PDF.
Addresses: dense text → visual/scannable; training sections show people figures;
last page replaced with a proper smile/CTA visual.

Usage:
  python build.py            → writes index.html
  FONT_SRC=/path/to/ttfs python render.py   → PDF + preview PNGs
"""

import pathlib, textwrap

HERE = pathlib.Path(__file__).resolve().parent

# ── colour palette ──────────────────────────────────────────────────────────
NAVY   = "#1d3a5f"   # deep navy – headers
TEAL   = "#3aaea0"   # teal accent
MINT   = "#c8ede8"   # mint bg tints
GOLD   = "#f5a623"   # highlight / badges
CREAM  = "#fff8f0"   # warm off-white pages
CORAL  = "#f07060"   # warning accent / villain
WHITE  = "#ffffff"
GRAY   = "#666680"
LGRAY  = "#f0f2f5"

# ── SVG helpers ─────────────────────────────────────────────────────────────

def g(dx=0, dy=0, sx=1, sy=None, content=""):
    sy = sy or sx
    return f'<g transform="translate({dx},{dy}) scale({sx},{sy})">{content}</g>'

def circle(cx, cy, r, fill, stroke="none", sw=0):
    s = f' stroke="{stroke}" stroke-width="{sw}"' if stroke != "none" else ""
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}"{s}/>'

def rect(x, y, w, h, fill, rx=0, ry=0, stroke="none", sw=0, opacity=1):
    s = f' stroke="{stroke}" stroke-width="{sw}"' if stroke != "none" else ""
    op = f' opacity="{opacity}"' if opacity != 1 else ""
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" rx="{rx}" ry="{ry}"{s}{op}/>'

def path(d, fill="none", stroke="none", sw=2, linecap="round", linejoin="round"):
    return (f'<path d="{d}" fill="{fill}" stroke="{stroke}" '
            f'stroke-width="{sw}" stroke-linecap="{linecap}" stroke-linejoin="{linejoin}"/>')

def text_el(x, y, txt, fill="#fff", size=28, weight="bold", anchor="middle", family="Rounded"):
    fam = "MPLUSRounded1c" if family == "Rounded" else "MochiyPopOne"
    return (f'<text x="{x}" y="{y}" text-anchor="{anchor}" '
            f'font-family="{fam}" font-size="{size}" font-weight="{weight}" fill="{fill}">{txt}</text>')

# ── Character: simple person figure ─────────────────────────────────────────

def person(cx, cy, scale=1.0, skin="#f5c8a0", hair="#4a3020", shirt="#3aaea0",
           pants="#1d3a5f", expression="smile", action="stand"):
    """Simple 2D person SVG for training illustrations."""
    s = scale
    parts = []

    # shadow
    parts.append(f'<ellipse cx="{cx}" cy="{cy+55*s}" rx="{22*s}" ry="{5*s}" fill="#00000020"/>')

    if action == "stand":
        # legs
        parts.append(path(f"M{cx-8*s},{cy+30*s} L{cx-10*s},{cy+55*s}", stroke=pants, sw=8*s))
        parts.append(path(f"M{cx+8*s},{cy+30*s} L{cx+10*s},{cy+55*s}", stroke=pants, sw=8*s))
        # arms
        parts.append(path(f"M{cx-13*s},{cy+8*s} L{cx-22*s},{cy+25*s}", stroke=shirt, sw=7*s))
        parts.append(path(f"M{cx+13*s},{cy+8*s} L{cx+22*s},{cy+25*s}", stroke=shirt, sw=7*s))
        # body
        parts.append(path(f"M{cx},{cy+2*s} L{cx},{cy+32*s}", stroke=shirt, sw=14*s, linecap="round"))

    elif action == "open_mouth":
        # legs
        parts.append(path(f"M{cx-8*s},{cy+30*s} L{cx-10*s},{cy+55*s}", stroke=pants, sw=8*s))
        parts.append(path(f"M{cx+8*s},{cy+30*s} L{cx+10*s},{cy+55*s}", stroke=pants, sw=8*s))
        # arms up (あいうべ pose)
        parts.append(path(f"M{cx-13*s},{cy+8*s} L{cx-28*s},{cy-8*s}", stroke=shirt, sw=7*s))
        parts.append(path(f"M{cx+13*s},{cy+8*s} L{cx+28*s},{cy-8*s}", stroke=shirt, sw=7*s))
        parts.append(circle(cx-28*s, cy-10*s, 5*s, skin))
        parts.append(circle(cx+28*s, cy-10*s, 5*s, skin))
        parts.append(path(f"M{cx},{cy+2*s} L{cx},{cy+32*s}", stroke=shirt, sw=14*s, linecap="round"))

    elif action == "stretch":
        # one arm up, leaning
        parts.append(path(f"M{cx-8*s},{cy+30*s} L{cx-12*s},{cy+55*s}", stroke=pants, sw=8*s))
        parts.append(path(f"M{cx+8*s},{cy+30*s} L{cx+8*s},{cy+55*s}", stroke=pants, sw=8*s))
        parts.append(path(f"M{cx-13*s},{cy+8*s} L{cx-20*s},{cy+25*s}", stroke=shirt, sw=7*s))
        parts.append(path(f"M{cx+13*s},{cy+8*s} L{cx+20*s},{cy-10*s}", stroke=shirt, sw=7*s))
        parts.append(circle(cx+20*s, cy-12*s, 5*s, skin))
        parts.append(path(f"M{cx},{cy+2*s} L{cx},{cy+32*s}", stroke=shirt, sw=14*s, linecap="round"))

    elif action == "sit":
        # seated position (in chair)
        parts.append(path(f"M{cx-8*s},{cy+15*s} L{cx-8*s},{cy+38*s} L{cx-18*s},{cy+55*s}", stroke=pants, sw=8*s))
        parts.append(path(f"M{cx+8*s},{cy+15*s} L{cx+8*s},{cy+38*s} L{cx+18*s},{cy+55*s}", stroke=pants, sw=8*s))
        parts.append(path(f"M{cx-13*s},{cy+5*s} L{cx-24*s},{cy+22*s}", stroke=shirt, sw=7*s))
        parts.append(path(f"M{cx+13*s},{cy+5*s} L{cx+24*s},{cy+22*s}", stroke=shirt, sw=7*s))
        parts.append(path(f"M{cx},{cy},{cy+2*s} L{cx},{cy+18*s}", stroke=shirt, sw=14*s, linecap="round"))

    # head
    parts.append(circle(cx, cy-15*s, 16*s, skin))
    # hair
    parts.append(f'<ellipse cx="{cx}" cy="{cy-25*s}" rx="{16*s}" ry="{10*s}" fill="{hair}"/>')
    parts.append(path(f"M{cx-16*s},{cy-18*s} Q{cx-18*s},{cy-10*s} {cx-14*s},{cy-8*s}", fill=hair))
    parts.append(path(f"M{cx+16*s},{cy-18*s} Q{cx+18*s},{cy-10*s} {cx+14*s},{cy-8*s}", fill=hair))

    # eyes
    parts.append(circle(cx-5*s, cy-16*s, 2.5*s, "#2a1a0a"))
    parts.append(circle(cx+5*s, cy-16*s, 2.5*s, "#2a1a0a"))

    # expression
    if expression == "smile":
        parts.append(path(f"M{cx-5*s},{cy-9*s} Q{cx},{cy-5*s} {cx+5*s},{cy-9*s}",
                          stroke="#2a1a0a", sw=1.5*s))
    elif expression == "open":
        parts.append(f'<ellipse cx="{cx}" cy="{cy-8*s}" rx="{5*s}" ry="{6*s}" fill="#c04060"/>')
        parts.append(path(f"M{cx-4*s},{cy-6*s} L{cx+4*s},{cy-6*s}", stroke="#f08090", sw=1.5*s))
    elif expression == "thinking":
        parts.append(path(f"M{cx-4*s},{cy-10*s} L{cx+4*s},{cy-10*s}",
                          stroke="#2a1a0a", sw=1.5*s))
        parts.append(f'<text x="{cx+20*s}" y="{cy-25*s}" font-size="{12*s}" fill="{GRAY}">？</text>')

    return "".join(parts)

# ── Tooth character ──────────────────────────────────────────────────────────

def tooth_happy(cx, cy, scale=1.0):
    s = scale
    pts = []
    # tooth body
    pts.append(path(
        f"M{cx-14*s},{cy} Q{cx-16*s},{cy-28*s} {cx},{cy-30*s} Q{cx+16*s},{cy-28*s} {cx+14*s},{cy}",
        fill=WHITE, stroke=TEAL, sw=2*s))
    # roots
    pts.append(path(f"M{cx-6*s},{cy} Q{cx-8*s},{cy+14*s} {cx-4*s},{cy+18*s}",
                    fill="none", stroke="#e0d0c0", sw=3*s))
    pts.append(path(f"M{cx+6*s},{cy} Q{cx+8*s},{cy+14*s} {cx+4*s},{cy+18*s}",
                    fill="none", stroke="#e0d0c0", sw=3*s))
    # face
    pts.append(circle(cx-5*s, cy-18*s, 2*s, NAVY))
    pts.append(circle(cx+5*s, cy-18*s, 2*s, NAVY))
    pts.append(path(f"M{cx-5*s},{cy-12*s} Q{cx},{cy-8*s} {cx+5*s},{cy-12*s}",
                    stroke=NAVY, sw=1.5*s))
    # sparkle
    for dx, dy in [(-18, -28), (18, -26)]:
        pts.append(f'<text x="{cx+dx*s}" y="{cy+dy*s}" font-size="{12*s}" fill="{GOLD}">✦</text>')
    return "".join(pts)

def tooth_sad(cx, cy, scale=1.0):
    s = scale
    pts = []
    pts.append(path(
        f"M{cx-14*s},{cy} Q{cx-16*s},{cy-28*s} {cx},{cy-30*s} Q{cx+16*s},{cy-28*s} {cx+14*s},{cy}",
        fill="#ffe8e8", stroke=CORAL, sw=2*s))
    pts.append(path(f"M{cx-6*s},{cy} Q{cx-8*s},{cy+14*s} {cx-4*s},{cy+18*s}",
                    fill="none", stroke="#e0d0c0", sw=3*s))
    pts.append(path(f"M{cx+6*s},{cy} Q{cx+8*s},{cy+14*s} {cx+4*s},{cy+18*s}",
                    fill="none", stroke="#e0d0c0", sw=3*s))
    pts.append(circle(cx-5*s, cy-18*s, 2*s, GRAY))
    pts.append(circle(cx+5*s, cy-18*s, 2*s, GRAY))
    pts.append(path(f"M{cx-5*s},{cy-10*s} Q{cx},{cy-14*s} {cx+5*s},{cy-10*s}",
                    stroke=GRAY, sw=1.5*s))
    pts.append(f'<text x="{cx}" y="{cy-35*s}" font-size="{10*s}" fill="{CORAL}" text-anchor="middle">痛い</text>')
    return "".join(pts)

# ── Icon helpers ─────────────────────────────────────────────────────────────

def icon_mouth(cx, cy, s=1.0, open_=True):
    """Simple mouth/lip icon."""
    parts = [circle(cx, cy, 18*s, CORAL, stroke=WHITE, sw=2*s)]
    if open_:
        parts.append(f'<ellipse cx="{cx}" cy="{cy+4*s}" rx="{10*s}" ry="{7*s}" fill="#c04060"/>')
        parts.append(f'<ellipse cx="{cx}" cy="{cy+5*s}" rx="{9*s}" ry="{4*s}" fill="#f08090"/>')
    else:
        parts.append(path(f"M{cx-10*s},{cy+4*s} Q{cx},{cy+8*s} {cx+10*s},{cy+4*s}",
                          stroke=WHITE, sw=2.5*s))
    return "".join(parts)

def icon_nose(cx, cy, s=1.0):
    parts = [circle(cx, cy, 18*s, "#a0c8e0", stroke=WHITE, sw=2*s)]
    parts.append(path(f"M{cx-6*s},{cy+2*s} Q{cx},{cy-8*s} {cx+6*s},{cy+2*s}",
                      stroke=NAVY, sw=2.5*s, fill="none"))
    parts.append(circle(cx-8*s, cy+4*s, 3*s, "#8090a0"))
    parts.append(circle(cx+8*s, cy+4*s, 3*s, "#8090a0"))
    return "".join(parts)

def icon_tongue(cx, cy, s=1.0):
    parts = [circle(cx, cy, 18*s, GUM := "#f6aec0", stroke=WHITE, sw=2*s)]
    parts.append(path(f"M{cx-8*s},{cy-4*s} Q{cx},{cy+14*s} {cx+8*s},{cy-4*s}",
                      fill="#f08090", stroke=CORAL, sw=1.5*s))
    return "".join(parts)

def icon_swallow(cx, cy, s=1.0):
    parts = [circle(cx, cy, 18*s, "#c8a0e0", stroke=WHITE, sw=2*s)]
    parts.append(path(f"M{cx},{cy-10*s} L{cx},{cy+10*s}", stroke=WHITE, sw=3*s))
    parts.append(path(f"M{cx-6*s},{cy+4*s} L{cx},{cy+10*s} L{cx+6*s},{cy+4*s}",
                      stroke=WHITE, sw=2*s))
    return "".join(parts)

def icon_check(cx, cy, s=1.0, color=TEAL):
    parts = [circle(cx, cy, 14*s, color)]
    parts.append(path(f"M{cx-7*s},{cy} L{cx-2*s},{cy+6*s} L{cx+7*s},{cy-6*s}",
                      stroke=WHITE, sw=2.5*s, fill="none"))
    return "".join(parts)

def icon_arrow_down(cx, cy, s=1.0):
    parts = [f'<polygon points="{cx},{cy+10*s} {cx-8*s},{cy-4*s} {cx+8*s},{cy-4*s}" fill="{GOLD}"/>']
    return "".join(parts)

# ── Step badge ───────────────────────────────────────────────────────────────

def step_badge(cx, cy, num, label, s=1.0):
    parts = []
    parts.append(circle(cx, cy, 18*s, NAVY))
    parts.append(text_el(cx, cy+6*s, str(num), fill=WHITE, size=int(20*s), weight="bold"))
    parts.append(text_el(cx+24*s, cy+5*s, label, fill=NAVY, size=int(13*s), weight="bold", anchor="start"))
    return "".join(parts)

# ── Page scenes ─────────────────────────────────────────────────────────────

def scene_cover():
    """Cover: big headline, smiling tooth, child+parent silhouette."""
    W, H = 560, 720
    parts = [
        # background gradient panels
        rect(0, 0, W, H, NAVY),
        rect(0, 0, W, 260, TEAL),
        # decorative circles
        f'<circle cx="480" cy="60" r="90" fill="{MINT}" opacity="0.25"/>',
        f'<circle cx="40" cy="620" r="70" fill="{GOLD}" opacity="0.18"/>',
        f'<circle cx="520" cy="580" r="50" fill="{TEAL}" opacity="0.15"/>',
    ]

    # large happy tooth centre-top
    parts.append(g(dx=280, dy=105, sx=2.4, content=tooth_happy(0, 0, 1.0)))

    # headline
    parts.append(text_el(280, 300, "12歳までが", fill=GOLD, size=36, weight="bold",
                          family="Pop"))
    parts.append(text_el(280, 342, "お口の育てどき", fill=WHITE, size=30, weight="bold",
                          family="Pop"))

    # sub
    parts.append(rect(40, 360, 480, 3, GOLD, rx=2))
    parts.append(text_el(280, 400, "マイオブレース小児矯正のご案内", fill=MINT, size=18))

    # parent + child figures
    parts.append(person(180, 530, scale=1.0, skin="#f5c8a0", hair="#3a2010",
                        shirt=NAVY, pants=GRAY, expression="smile", action="stand"))
    parts.append(person(360, 545, scale=0.78, skin="#f8d8b0", hair="#2a1808",
                        shirt=TEAL, pants="#5a7090", expression="smile", action="stand"))

    # clinic tag at bottom
    parts.append(rect(0, 650, W, 70, WHITE, opacity=0.12))
    parts.append(text_el(280, 680, "［ 医院名 ］", fill=WHITE, size=18))
    parts.append(text_el(280, 705, "予約・お問い合わせ ［ 電話番号 ］", fill=MINT, size=13))

    return f'<svg viewBox="0 0 {W} {H}" width="{W}" height="{H}" xmlns="http://www.w3.org/2000/svg">' \
           + "".join(parts) + "</svg>"


def scene_p2():
    """Page 2: 'なぜ歯ならびが悪くなるの？' — 4 cause icons, minimal text."""
    W, H = 560, 660
    parts = [rect(0, 0, W, H, CREAM)]

    # section header bar
    parts.append(rect(0, 0, W, 64, TEAL))
    parts.append(text_el(280, 44, "なぜ歯ならびが悪くなるの？", fill=WHITE, size=22,
                          family="Pop"))

    # 4 cause boxes in 2×2 grid
    causes = [
        (icon_mouth(0, 0, 1.0, open_=True), "口呼吸", "口がポカンと\n開いている"),
        (icon_tongue(0, 0, 1.0), "舌のクセ", "舌が正しい\n位置にない"),
        (icon_swallow(0, 0, 1.0), "飲み込みグセ", "舌を前に押し\nながら飲む"),
        (icon_nose(0, 0, 1.0), "鼻づまり", "慢性的な\n鼻詰まり"),
    ]

    positions = [(110, 165), (310, 165), (110, 360), (310, 360)]
    for (px, py), (icon_svg, title, desc) in zip(positions, causes):
        # card bg
        parts.append(rect(px-90, py-70, 180, 170, WHITE, rx=14,
                          stroke=TEAL, sw=1.5, opacity=1))
        # icon
        parts.append(g(dx=px, dy=py-30, sx=1.1, content=icon_svg))
        parts.append(text_el(px, py+55, title, fill=NAVY, size=16, weight="bold"))
        for i, line in enumerate(desc.split("\n")):
            parts.append(text_el(px, py+74+i*17, line, fill=GRAY, size=12, weight="normal"))

    # bottom callout
    parts.append(rect(30, 538, W-60, 100, MINT, rx=12))
    parts.append(text_el(280, 575, "これらの「クセ」が顎の発育を妨げます", fill=NAVY, size=16, weight="bold"))
    parts.append(text_el(280, 598, "早期発見・早期アプローチで正しい発育をサポート", fill=GRAY, size=13, weight="normal"))
    parts.append(text_el(280, 618, "理想は ３〜12歳 の間に開始！", fill=TEAL, size=15, weight="bold"))

    return (f'<svg viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
            f'xmlns="http://www.w3.org/2000/svg">' + "".join(parts) + "</svg>")


def scene_p3():
    """Page 3: 3-step treatment flow — large step blocks, minimal text."""
    W, H = 560, 700
    parts = [rect(0, 0, W, H, CREAM)]

    parts.append(rect(0, 0, W, 64, NAVY))
    parts.append(text_el(280, 44, "３ステップの矯正治療", fill=WHITE, size=22, family="Pop"))

    steps = [
        ("STEP 1", "マイオブレス", "¥ 286,000〜", TEAL,
         "筋機能トレーナーで口の筋肉・呼吸を整える"),
        ("STEP 2", "Ⅰ期治療", "¥ 440,000〜", GOLD,
         "顎の骨の成長をガイド（6〜12歳目安）"),
        ("STEP 3", "Ⅱ期治療", "¥ 946,000〜", CORAL,
         "永久歯が揃ったら最終的な歯列調整"),
    ]

    y0 = 90
    for i, (step_label, name, price, color, desc) in enumerate(steps):
        y = y0 + i * 188
        # card
        parts.append(rect(28, y, W-56, 170, WHITE, rx=16, stroke=color, sw=2))
        # left color stripe
        parts.append(rect(28, y, 10, 170, color, rx=8))
        # step pill
        parts.append(rect(48, y+18, 86, 28, color, rx=14))
        parts.append(text_el(91, y+37, step_label, fill=WHITE, size=13, weight="bold"))
        # name
        parts.append(text_el(154, y+37, name, fill=NAVY, size=20, weight="bold", anchor="start"))
        # price badge
        parts.append(rect(W-140, y+14, 116, 36, color, rx=18, opacity=0.15))
        parts.append(text_el(W-82, y+38, price, fill=color, size=15, weight="bold"))
        # desc
        parts.append(text_el(70, y+80, desc, fill=GRAY, size=14, weight="normal", anchor="start"))

        # small figure doing treatment
        if i == 0:
            # child with myobrace device shown as mouth piece
            fx, fy = W-100, y+110
            parts.append(person(fx, fy, scale=0.55, skin="#f8d8b0", hair="#3a2010",
                                shirt=TEAL, pants="#5a7090", expression="open", action="open_mouth"))
            # device hint
            parts.append(rect(fx-20, fy-20, 40, 18, TEAL, rx=9, opacity=0.8))
            parts.append(text_el(fx, fy-10, "装置", fill=WHITE, size=9, weight="bold"))
        elif i == 1:
            fx, fy = W-100, y+110
            parts.append(person(fx, fy, scale=0.55, skin="#f5c8a0", hair="#3a2010",
                                shirt="#5a7090", pants=NAVY, expression="smile", action="stand"))
        elif i == 2:
            fx, fy = W-100, y+110
            parts.append(person(fx, fy, scale=0.55, skin="#f5c8a0", hair="#3a2010",
                                shirt=CORAL, pants=NAVY, expression="smile", action="stand"))
            # wire hint at mouth level (scale=0.55 → mouth ≈ fy-5)
            parts.append(path(f"M{fx-11},{fy-5} Q{fx},{fy-7} {fx+11},{fy-5}",
                              stroke=NAVY, sw=2.5, fill="none"))

        # arrow between steps
        if i < 2:
            ay = y + 170 + 9
            parts.append(f'<polygon points="{280},{ay+14} {268},{ay} {292},{ay}" fill="{color}"/>')

    return (f'<svg viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
            f'xmlns="http://www.w3.org/2000/svg">' + "".join(parts) + "</svg>")


def scene_p4():
    """Page 4: Training — あいうべ exercises with person figures."""
    W, H = 560, 700
    parts = [rect(0, 0, W, H, CREAM)]

    parts.append(rect(0, 0, W, 64, TEAL))
    parts.append(text_el(280, 44, "おうちでできる！あいうべ体操", fill=WHITE, size=20, family="Pop"))

    intro = "毎日続けることで口の筋肉が鍛えられ、自然な鼻呼吸へ。"
    parts.append(rect(30, 72, W-60, 36, MINT, rx=10))
    parts.append(text_el(280, 96, intro, fill=NAVY, size=13))

    # 4 poses
    poses = [
        ("あ", "大きく口を開く", "open", "open_mouth", "#f5c8a0"),
        ("い", "口を横に大きく引く", "smile", "stretch", "#f8d8b0"),
        ("う", "唇を前に突き出す", "thinking", "stand", "#f5c8a0"),
        ("べ", "舌を真下に伸ばす", "open", "open_mouth", "#fad0a8"),
    ]

    cols = [100, 260, 420]  # 3-col would crowd — use 2x2
    positions2 = [(130, 255), (380, 255), (130, 480), (380, 480)]

    for (px, py), (mora, desc, expr, action, skin) in zip(positions2, poses):
        # card
        parts.append(rect(px-100, py-140, 200, 235, WHITE, rx=14,
                          stroke=TEAL, sw=1.5))
        # mora circle
        parts.append(circle(px, py-105, 26, TEAL))
        parts.append(text_el(px, py-95, mora, fill=WHITE, size=28, weight="bold", family="Pop"))
        # person figure
        parts.append(person(px, py-10, scale=0.9, skin=skin, hair="#3a2010",
                            shirt=TEAL, pants=NAVY, expression=expr, action=action))
        # desc
        parts.append(text_el(px, py+82, desc, fill=GRAY, size=12, weight="normal"))

    # tip box
    parts.append(rect(30, 598, W-60, 88, NAVY, rx=12))
    parts.append(text_el(280, 628, "1日30回 × 続けることが大切！", fill=GOLD, size=16, weight="bold"))
    parts.append(text_el(280, 652, "診療中にスタッフが正しいやり方を指導します", fill=WHITE, size=13, weight="normal"))
    parts.append(text_el(280, 672, "まずは無料カウンセリングへ", fill=MINT, size=13, weight="bold"))

    return (f'<svg viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
            f'xmlns="http://www.w3.org/2000/svg">' + "".join(parts) + "</svg>")


def scene_p5():
    """Page 5: お子さんのサイン — symptoms checklist."""
    W, H = 560, 680
    parts = [rect(0, 0, W, H, CREAM)]

    parts.append(rect(0, 0, W, 64, GOLD))
    parts.append(text_el(280, 44, "こんなサイン、気になりませんか？", fill=WHITE, size=20, family="Pop"))

    # symptom checklist
    symptoms = [
        "口がポカンと開いている",
        "いびきをかく・口で息をする",
        "歯ならびがデコボコ",
        "顎が小さい・出っ歯気味",
        "食べるのが遅い・好き嫌いが多い",
        "舌が正しい位置にない",
    ]

    for i, sym in enumerate(symptoms):
        iy = 95 + i * 82
        # alternating bg
        bg = MINT if i % 2 == 0 else WHITE
        parts.append(rect(28, iy, W-56, 70, bg, rx=12))
        # check icon space (placeholder X if unchecked)
        parts.append(f'<circle cx="62" cy="{iy+35}" r="18" fill="{TEAL}" opacity="0.2"/>')
        parts.append(f'<circle cx="62" cy="{iy+35}" r="18" fill="none" stroke="{TEAL}" stroke-width="2"/>')
        parts.append(text_el(62, iy+41, "✓", fill=TEAL, size=20, weight="bold"))
        parts.append(text_el(90, iy+40, sym, fill=NAVY, size=16, weight="bold", anchor="start"))

    # bottom prompt
    parts.append(rect(28, 594, W-56, 72, NAVY, rx=12))
    parts.append(text_el(280, 626, "1つでも当てはまったら…", fill=GOLD, size=16, weight="bold"))
    parts.append(text_el(280, 652, "早めのご相談をおすすめします", fill=WHITE, size=15))

    return (f'<svg viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
            f'xmlns="http://www.w3.org/2000/svg">' + "".join(parts) + "</svg>")


def scene_p6():
    """Page 6: 治療の流れ + CTA — replaces the inexplicable chair photo."""
    W, H = 560, 800
    parts = [rect(0, 0, W, H, CREAM)]

    # top header
    parts.append(rect(0, 0, W, 58, NAVY))
    parts.append(text_el(280, 40, "治療の流れ", fill=WHITE, size=22, family="Pop"))

    # 4-step flow — compact layout
    flow = [
        (TEAL,  "① 無料相談",        "お口の状態・お悩みをお聞きします"),
        (GOLD,  "② 精密検査",        "レントゲン・口腔スキャン（約60分）"),
        (CORAL, "③ 治療計画のご説明", "費用・期間・装置をわかりやすく説明"),
        (NAVY,  "④ 治療スタート",     "マイオブレスの装着・あいうべ指導"),
    ]

    y0 = 66
    step_h = 84
    gap = 102
    for i, (color, title, desc) in enumerate(flow):
        fy = y0 + i * gap
        parts.append(rect(30, fy, W-60, step_h, WHITE, rx=12, stroke=color, sw=2))
        parts.append(rect(30, fy, 8, step_h, color, rx=4))
        parts.append(circle(W-64, fy+step_h//2, 23, color))
        parts.append(text_el(W-64, fy+step_h//2+7, str(i+1), fill=WHITE, size=20, weight="bold"))
        parts.append(text_el(58, fy+30, title, fill=NAVY, size=16, weight="bold", anchor="start"))
        parts.append(text_el(58, fy+56, desc, fill=GRAY, size=13, weight="normal", anchor="start"))
        if i < 3:
            ay = fy + step_h + 4
            parts.append(f'<polygon points="{280},{ay+11} {269},{ay} {291},{ay}" fill="{color}"/>')

    # CTA section (replaces chair photo with clinic info + smiling teeth)
    cta_y = y0 + 4 * gap - (gap - step_h) + 14
    parts.append(rect(0, cta_y, W, H - cta_y, TEAL))

    # happy teeth row
    for ti, tx in enumerate([90, 190, 290, 390, 468]):
        s = 0.50 if ti != 2 else 0.68
        parts.append(g(dx=tx, dy=cta_y+46, sx=s, content=tooth_happy(0, 0, 1.0)))

    parts.append(text_el(280, cta_y + 96, "笑顔あふれる未来のために", fill=WHITE, size=18, weight="bold",
                          family="Pop"))

    # clinic info block
    info_top = cta_y + 108
    info_h = 168
    parts.append(rect(36, info_top, W-72, info_h, WHITE, rx=12, opacity=0.92))
    info_lines = [
        ("医院名",   "［ クリニック名 ］"),
        ("住所",     "［ 住所 ］"),
        ("電話",     "［ 電話番号 ］"),
        ("受付時間", "月〜土 9:00〜18:00（日・祝休）"),
        ("初診",     "無料カウンセリング実施中"),
    ]
    for j, (label, val) in enumerate(info_lines):
        iy = info_top + 28 + j * 28
        parts.append(text_el(62, iy, label, fill=TEAL, size=12, weight="bold", anchor="start"))
        parts.append(text_el(176, iy, val, fill=NAVY, size=13, weight="normal", anchor="start"))

    # legal note
    note = "※表示価格は税込。治療効果は個人差があります。副作用・リスクはカウンセリング時にご説明します。"
    parts.append(text_el(280, H-16, note, fill=WHITE, size=9, weight="normal"))

    return (f'<svg viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
            f'xmlns="http://www.w3.org/2000/svg">' + "".join(parts) + "</svg>")


# ── CSS ──────────────────────────────────────────────────────────────────────

CSS = """
@font-face {
  font-family: MPLUSRounded1c;
  src: url(fonts/MPLUSRounded1c-Regular.woff2) format('woff2');
  font-weight: 400;
}
@font-face {
  font-family: MPLUSRounded1c;
  src: url(fonts/MPLUSRounded1c-Medium.woff2) format('woff2');
  font-weight: 500;
}
@font-face {
  font-family: MPLUSRounded1c;
  src: url(fonts/MPLUSRounded1c-Bold.woff2) format('woff2');
  font-weight: 700;
}
@font-face {
  font-family: MochiyPopOne;
  src: url(fonts/MochiyPopOne-Regular.woff2) format('woff2');
  font-weight: 400 700;
}
@page {
  size: A5 portrait;
  margin: 0;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #e0e0e0; }
.page {
  width: 148mm;
  height: 210mm;
  overflow: hidden;
  background: white;
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
  page-break-after: always;
  display: flex;
  align-items: stretch;
}
.page svg {
  width: 100%;
  height: 100%;
}
@media screen {
  body { padding: 20px; }
  .page {
    margin: 0 auto 24px;
    box-shadow: 0 4px 24px #0004;
    border-radius: 4px;
  }
}
"""

# ── Build ────────────────────────────────────────────────────────────────────

PAGES = [
    ("表紙", scene_cover()),
    ("原因", scene_p2()),
    ("3ステップ", scene_p3()),
    ("あいうべ体操", scene_p4()),
    ("サインチェック", scene_p5()),
    ("治療の流れ・CTA", scene_p6()),
]


def build_html():
    page_html = "\n".join(
        f'  <!-- P{i+1}: {label} -->\n  <div class="page">{svg}</div>'
        for i, (label, svg) in enumerate(PAGES)
    )
    return f"""<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>マイオブレース小児矯正パンフレット — 改訂版</title>
<style>{CSS}</style>
</head>
<body>
{page_html}
</body>
</html>
"""


if __name__ == "__main__":
    out = HERE / "index.html"
    out.write_text(build_html(), encoding="utf-8")
    print("wrote", out, len(build_html()), "bytes")
