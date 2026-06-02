#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
は探偵ハクちゃん ～きえた ニコニコ歯ならびの なぞ～
絵本風 小児矯正パンフレット (A5 / 全6ページ) ジェネレータ。
SVGキャラクターを部品化して全ページを組版し、index.html を出力する。
PDF化・PNG検証は render.py（WeasyPrint + PyMuPDF）。
"""
import sys, math

OUT  = "#4b4b5e"; INK = "#4b4b5e"
MINT = "#8fded0"; MINT_D = "#3fb39c"; MINT_BG = "#e9f7f1"
SKY  = "#bfe3f2"; SKY_D = "#5aa7cd"; SKY_BG = "#e9f5fb"
CREAM= "#fff6e6"; CREAM_D = "#efdcb6"
CORAL= "#ffb3a7"; CORAL_D = "#ef7e6c"
GUM  = "#f6aec0"; GUM_D = "#e3879f"
TOOTH= "#ffffff"; TOOTH_SH = "#e8eef2"
HAT  = "#bb824e"; HAT_D = "#9c6838"
MOUTH= "#7a5b6b"

def G(content, tx=0.0, ty=0.0, s=1.0, rot=0.0):
    t = f"translate({tx:.2f},{ty:.2f})"
    if abs(s-1) > 1e-6: t += f" scale({s:.4f})"
    if abs(rot) > 1e-6: t += f" rotate({rot:.2f})"
    return f'<g transform="{t}">{content}</g>'

def limb(x1, y1, x2, y2, w=15, fill=TOOTH):
    return (f'<path d="M{x1},{y1} L{x2},{y2}" stroke="{OUT}" stroke-width="{w+5}" stroke-linecap="round" fill="none"/>'
            f'<path d="M{x1},{y1} L{x2},{y2}" stroke="{fill}" stroke-width="{w}" stroke-linecap="round" fill="none"/>')

def sparkle(x, y, r=14, c="#fff3bf"):
    return (f'<g transform="translate({x},{y})"><path d="M0,{-r} C{r*0.16},{-r*0.16} {r*0.16},{-r*0.16} {r},0 '
            f'C{r*0.16},{r*0.16} {r*0.16},{r*0.16} 0,{r} C{-r*0.16},{r*0.16} {-r*0.16},{r*0.16} {-r},0 '
            f'C{-r*0.16},{-r*0.16} {-r*0.16},{-r*0.16} 0,{-r} Z" fill="{c}" stroke="{OUT}" stroke-width="2.5"/></g>')

def dot(x, y, r, c): return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}"/>'

def otext(x, y, txt, fill, fs, halo="#fff", hw=8, font="Pop", anchor="middle"):
    """白ハロー＋色塗りの二重描き（paint-order非対応環境でも色が出る）。"""
    common = f'x="{x}" y="{y}" text-anchor="{anchor}" font-family="{font}" font-size="{fs}"'
    return (f'<text {common} fill="{halo}" stroke="{halo}" stroke-width="{hw}" stroke-linejoin="round">{txt}</text>'
            f'<text {common} fill="{fill}">{txt}</text>')

def cloud(x, y, s=1.0):
    c = (f'<ellipse cx="0" cy="0" rx="46" ry="30" fill="#fff" stroke="{OUT}" stroke-width="4"/>'
         f'<circle cx="-30" cy="6" r="22" fill="#fff" stroke="{OUT}" stroke-width="4"/>'
         f'<circle cx="30" cy="6" r="22" fill="#fff" stroke="{OUT}" stroke-width="4"/>'
         f'<rect x="-52" y="2" width="104" height="24" fill="#fff"/>')
    return G(c, x, y, s)

def sun(x, y, s=1.0):
    rays = "".join(f'<line x1="{math.cos(math.radians(i*30))*46:.1f}" y1="{math.sin(math.radians(i*30))*46:.1f}" '
                   f'x2="{math.cos(math.radians(i*30))*66:.1f}" y2="{math.sin(math.radians(i*30))*66:.1f}" '
                   f'stroke="#f6c453" stroke-width="7" stroke-linecap="round"/>' for i in range(12))
    body = (f'{rays}<circle r="40" fill="#ffe08a" stroke="{OUT}" stroke-width="4"/>'
            f'<circle cx="-13" cy="-3" r="5" fill="{OUT}"/><circle cx="13" cy="-3" r="5" fill="{OUT}"/>'
            f'<ellipse cx="-22" cy="8" rx="7" ry="5" fill="{CORAL}" opacity=".7"/>'
            f'<ellipse cx="22" cy="8" rx="7" ry="5" fill="{CORAL}" opacity=".7"/>'
            f'<path d="M-11,9 Q0,20 11,9" fill="none" stroke="{OUT}" stroke-width="4" stroke-linecap="round"/>')
    return G(body, x, y, s)

def confetti(seedpts):
    cols = [MINT, SKY, CORAL, "#ffe08a", GUM]
    s = ""
    for i,(x,y,r) in enumerate(seedpts):
        c = cols[i % len(cols)]
        if i % 2: s += f'<rect x="{x}" y="{y}" width="16" height="10" rx="3" fill="{c}" stroke="{OUT}" stroke-width="2" transform="rotate({r} {x+8} {y+5})"/>'
        else:     s += f'<circle cx="{x}" cy="{y}" r="7" fill="{c}" stroke="{OUT}" stroke-width="2"/>'
    return s

def face(eye_dx=22, eye_y=-28, eye_r=11, cheek=True, mood="happy"):
    s = ""
    if mood == "worried":
        s += dot(-eye_dx, eye_y, eye_r*0.9, OUT) + dot(eye_dx, eye_y, eye_r*0.9, OUT)
        s += dot(-eye_dx+3, eye_y-3, 3, "#fff") + dot(eye_dx+3, eye_y-3, 3, "#fff")
        s += f'<path d="M-13,4 Q-6,-3 0,3 Q6,9 13,2" fill="none" stroke="{OUT}" stroke-width="4.5" stroke-linecap="round"/>'
        s += f'<path d="M{eye_dx+12},{eye_y-2} q6,10 0,16 q-6,-6 0,-16Z" fill="{SKY_D}" stroke="{OUT}" stroke-width="2"/>'
    elif mood == "wink":
        s += f'<path d="M{-eye_dx-9},{eye_y} q9,8 18,0" fill="none" stroke="{OUT}" stroke-width="5" stroke-linecap="round"/>'
        s += dot(eye_dx, eye_y, eye_r, OUT) + dot(eye_dx+3, eye_y-4, 3.4, "#fff")
        s += f'<path d="M-15,-2 Q0,16 15,-2" fill="none" stroke="{OUT}" stroke-width="5" stroke-linecap="round"/>'
    elif mood == "sleepy":
        s += f'<path d="M{-eye_dx-9},{eye_y} q9,7 18,0" fill="none" stroke="{OUT}" stroke-width="4.5" stroke-linecap="round"/>'
        s += f'<path d="M{eye_dx-9},{eye_y} q9,7 18,0" fill="none" stroke="{OUT}" stroke-width="4.5" stroke-linecap="round"/>'
    elif mood == "joy":  # big open happy
        s += dot(-eye_dx, eye_y, eye_r, OUT) + dot(eye_dx, eye_y, eye_r, OUT)
        s += dot(-eye_dx+3.5, eye_y-4, 3.6, "#fff") + dot(eye_dx+3.5, eye_y-4, 3.6, "#fff")
        s += f'<path d="M-17,-3 Q0,24 17,-3 Q0,6 -17,-3 Z" fill="{MOUTH}" stroke="{OUT}" stroke-width="4"/>'
        s += f'<path d="M-9,7 Q0,12 9,7" fill="{CORAL}" opacity=".9"/>'
    else:  # happy
        s += dot(-eye_dx, eye_y, eye_r, OUT) + dot(eye_dx, eye_y, eye_r, OUT)
        s += dot(-eye_dx+3.5, eye_y-4, 3.6, "#fff") + dot(eye_dx+3.5, eye_y-4, 3.6, "#fff")
        s += f'<path d="M-15,-2 Q0,16 15,-2" fill="none" stroke="{OUT}" stroke-width="5" stroke-linecap="round"/>'
    if cheek and mood != "sleepy":
        s += (f'<ellipse cx="-{eye_dx+13}" cy="-4" rx="9" ry="6.5" fill="{CORAL}" opacity=".75"/>'
              f'<ellipse cx="{eye_dx+13}" cy="-4" rx="9" ry="6.5" fill="{CORAL}" opacity=".75"/>')
    return s

TOOTH_PATH = ("M-58,-52 C-58,-96 58,-96 58,-52 C58,-12 52,24 39,58 C31,82 17,92 8,72 "
              "C4,62 -4,62 -8,72 C-17,92 -31,82 -39,58 C-52,24 -58,-12 -58,-52 Z")

def tooth(fill=TOOTH, mood="happy"):
    return (f'<path d="{TOOTH_PATH}" fill="{fill}" stroke="{OUT}" stroke-width="6"/>'
            f'<path d="M-40,-58 C-40,-78 18,-82 30,-66" fill="none" stroke="{TOOTH_SH}" stroke-width="7" stroke-linecap="round" opacity=".8"/>'
            + face(mood=mood))

def haku(scale=1.0, mood="wink", mag=True, wave=False):
    s = ""
    s += limb(-44, 6, (-72 if not wave else -64), (34 if not wave else -36), 14)
    s += limb(44, 4, 74, -34, 14) if mag else limb(44, 6, 70, 34, 14)
    s += tooth(TOOTH, mood)
    s += (f'<path d="M-62,-50 Q0,-44 62,-50 Q0,-66 -62,-50 Z" fill="{HAT_D}" stroke="{OUT}" stroke-width="4"/>'
          f'<circle cx="-60" cy="-56" r="13" fill="{HAT}" stroke="{OUT}" stroke-width="4"/>'
          f'<circle cx="60" cy="-56" r="13" fill="{HAT}" stroke="{OUT}" stroke-width="4"/>'
          f'<path d="M-54,-58 C-54,-104 54,-104 54,-58 C30,-70 -30,-70 -54,-58 Z" fill="{HAT}" stroke="{OUT}" stroke-width="5"/>'
          f'<path d="M-30,-66 C-30,-92 30,-92 30,-66" fill="none" stroke="{HAT_D}" stroke-width="5" opacity=".7"/>'
          f'<circle cx="0" cy="-99" r="8" fill="{HAT_D}" stroke="{OUT}" stroke-width="4"/>')
    if mag:
        s += (f'<circle cx="86" cy="-50" r="27" fill="{SKY}" opacity=".55"/>'
              f'<circle cx="86" cy="-50" r="27" fill="none" stroke="{OUT}" stroke-width="8"/>'
              f'<path d="M78,-58 q-8,4 -6,14" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".9"/>'
              f'<path d="M68,-30 L52,-14" stroke="{OUT}" stroke-width="13" stroke-linecap="round"/>'
              f'<path d="M68,-30 L52,-14" stroke="{HAT}" stroke-width="7" stroke-linecap="round"/>'
              f'<circle cx="74" cy="-22" r="11" fill="{TOOTH}" stroke="{OUT}" stroke-width="5"/>')
    return G(s, 0, 0, scale)

def pokan(scale=1.0, flee=False):
    s = (f'{limb(-52,18,-72,40,12,"#a9d8ec")}{limb(52,18,72,40,12,"#a9d8ec")}'
         f'<circle r="60" fill="#a9d8ec" stroke="{OUT}" stroke-width="6"/>'
         f'<path d="M-34,-20 Q-22,-30 -8,-22" fill="none" stroke="{OUT}" stroke-width="5" stroke-linecap="round"/>'
         f'<path d="M8,-22 Q22,-30 34,-20" fill="none" stroke="{OUT}" stroke-width="5" stroke-linecap="round"/>'
         f'<circle cx="-21" cy="-12" r="6" fill="{OUT}"/><circle cx="21" cy="-12" r="6" fill="{OUT}"/>'
         f'<ellipse cx="0" cy="26" rx="17" ry="22" fill="{MOUTH}" stroke="{OUT}" stroke-width="4"/>'
         f'<ellipse cx="-34" cy="6" rx="8" ry="6" fill="{CORAL}" opacity=".5"/><ellipse cx="34" cy="6" rx="8" ry="6" fill="{CORAL}" opacity=".5"/>')
    if not flee:
        s += f'<text x="44" y="-40" font-family="Pop" font-size="22" fill="{SKY_D}">z</text><text x="60" y="-58" font-family="Pop" font-size="15" fill="{SKY_D}">z</text>'
    return G(s, 0, 0, scale)

def bero(scale=1.0):
    s = (f'<path d="M-40,40 C-58,-30 58,-30 40,40 C30,64 -30,64 -40,40 Z" fill="{GUM}" stroke="{OUT}" stroke-width="6"/>'
         f'<path d="M0,-22 Q7,12 0,46" fill="none" stroke="{GUM_D}" stroke-width="4" stroke-linecap="round" opacity=".8"/>'
         f'<path d="M-28,-12 L-8,-6" stroke="{OUT}" stroke-width="4.5" stroke-linecap="round"/>'
         f'<path d="M28,-12 L8,-6" stroke="{OUT}" stroke-width="4.5" stroke-linecap="round"/>'
         f'<circle cx="-15" cy="4" r="6.5" fill="{OUT}"/><circle cx="17" cy="4" r="6.5" fill="{OUT}"/>'
         f'<circle cx="-13" cy="2" r="2.2" fill="#fff"/><circle cx="19" cy="2" r="2.2" fill="#fff"/>'
         f'<path d="M-12,22 Q0,34 12,22" fill="{MOUTH}" stroke="{OUT}" stroke-width="3.5"/>'
         f'<ellipse cx="-26" cy="14" rx="7" ry="5" fill="{CORAL}" opacity=".6"/><ellipse cx="26" cy="14" rx="7" ry="5" fill="{CORAL}" opacity=".6"/>')
    return G(s, 0, 0, scale, -8)

def myobrace(scale=1.0):
    s = (f'<path d="M-60,-46 C-60,70 60,70 60,-46 L34,-46 C34,46 -34,46 -34,-46 Z" fill="{MINT}" stroke="{OUT}" stroke-width="6"/>'
         f'<circle cx="-20" cy="6" r="7" fill="{OUT}"/><circle cx="20" cy="6" r="7" fill="{OUT}"/>'
         f'<circle cx="-17.5" cy="3" r="2.4" fill="#fff"/><circle cx="22.5" cy="3" r="2.4" fill="#fff"/>'
         f'<path d="M-14,18 Q0,30 14,18" fill="none" stroke="{OUT}" stroke-width="5" stroke-linecap="round"/>'
         f'<ellipse cx="-34" cy="14" rx="8" ry="6" fill="{CORAL}" opacity=".7"/><ellipse cx="34" cy="14" rx="8" ry="6" fill="{CORAL}" opacity=".7"/>')
    return G(s, 0, 0, scale)

def aligner_tooth(scale=1.0):
    s = (tooth(TOOTH, "happy") + f'<path d="{TOOTH_PATH}" fill="{SKY}" opacity=".32"/>'
         + f'<path d="M-58,-52 C-58,-96 58,-96 58,-52 C58,-20 54,8 46,30" fill="none" stroke="#bfe9fb" stroke-width="7" opacity=".95" stroke-linecap="round"/>'
         + sparkle(48, -56, 13, "#eaffff"))
    return G(s, 0, 0, scale)

def wire_teeth(scale=1.0, n=4):
    s = ""; span = 86; x0 = -(n-1)*span/2
    s += f'<path d="M{x0-30},2 L{x0+(n-1)*span+30},2" stroke="#cfd6dd" stroke-width="11" stroke-linecap="round"/>'
    s += f'<path d="M{x0-30},2 L{x0+(n-1)*span+30},2" stroke="#9aa6b2" stroke-width="5" stroke-linecap="round"/>'
    for i in range(n):
        x = x0 + i*span
        s += G(tooth(TOOTH, "happy"), x, 6, 0.62)
        s += f'<rect x="{x-9}" y="-7" width="18" height="18" rx="4" fill="{SKY}" stroke="{OUT}" stroke-width="4"/>'
    return G(s, 0, 0, scale)

def gum_street(w=1100, y=470, color=GUM):
    return (f'<path d="M{-w/2},{y+34} Q{-w/4},{y} 0,{y+16} Q{w/4},{y+32} {w/2},{y+4} '
            f'L{w/2},{y+260} L{-w/2},{y+260} Z" fill="{color}" stroke="{GUM_D}" stroke-width="5"/>')

def mouth_bubble(x, y, kana, ring):
    return (f'<g transform="translate({x},{y})"><circle r="46" fill="#fff" stroke="{ring}" stroke-width="6"/>'
            f'<text x="0" y="16" text-anchor="middle" font-family="Pop" font-size="44" fill="{ring}">{kana}</text></g>')

def motion(x, y, n=3, dx=22, dy=0, col=None):
    col = col or SKY_D
    return "".join(f'<line x1="{x-i*dx}" y1="{y+i*dy}" x2="{x-i*dx-16}" y2="{y+i*dy}" stroke="{col}" stroke-width="5" stroke-linecap="round" opacity="{0.9-i*0.2}"/>' for i in range(n))

def qmark(x, y, s=1.0, col=None):
    col = col or MINT_D
    return G(f'<text x="0" y="0" text-anchor="middle" font-family="Pop" font-size="80" fill="{col}" stroke="#fff" stroke-width="6" paint-order="stroke">?</text>', x, y, s)

# ---------------- scenes ----------------
def scene_wrap(inner, w=1000, h=620, bg=""):
    return (f'<svg class="ill" viewBox="0 0 {w} {h}" preserveAspectRatio="xMidYMid slice" '
            f'xmlns="http://www.w3.org/2000/svg">{bg}{inner}</svg>')

def bg_rect(w, h, col, grad=None):
    if grad: return grad
    return f'<rect width="{w}" height="{h}" fill="{col}"/>'

def scene_cover():
    w, h = 1000, 1419
    grad = (f'<defs><radialGradient id="cg" cx="50%" cy="42%" r="62%">'
            f'<stop offset="0%" stop-color="#ffffff"/><stop offset="42%" stop-color="{MINT_BG}"/>'
            f'<stop offset="100%" stop-color="{MINT}"/></radialGradient></defs>'
            f'<rect width="{w}" height="{h}" fill="url(#cg)"/>')
    deco = "".join([sparkle(150,420,20), sparkle(860,360,24), sparkle(120,820,16), sparkle(880,860,20),
                    sparkle(250,1080,16), sparkle(770,1120,22), sparkle(500,300,14),
                    dot(330,250,7,"#fff"), dot(680,1180,8,"#fff"), dot(820,640,7,"#fff"), dot(180,620,6,"#fff")])
    # ground halo
    ground = f'<ellipse cx="500" cy="990" rx="300" ry="46" fill="{MINT_D}" opacity=".18"/>'
    hero = G(haku(1.0, mood="wink", mag=True), 500, 770, 2.9)
    return scene_wrap(deco + ground + hero, w, h, bg=grad)

def scene_p2():
    w,h = 1000,620
    bg = (f'<defs><linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1">'
          f'<stop offset="0%" stop-color="{SKY_BG}"/><stop offset="100%" stop-color="#f4fbff"/></linearGradient></defs>'
          f'<rect width="{w}" height="{h}" fill="url(#sky2)"/>')
    inner = cloud(180,90,0.7) + cloud(830,70,0.6) + sun(900,110,0.7)
    inner += gum_street(1300, 430)
    # neat happy row (left)
    for i,x in enumerate([120,210,300]):
        inner += G(tooth(TOOTH,"happy"), x, 470, 0.52)
    inner += f'<text x="210" y="585" text-anchor="middle" font-family="Pop" font-size="24" fill="{MINT_D}">なかよし♪</text>'
    # jumbled worried row (right)
    jiggle = [(700,470,-16,0.5),(770,452,12,0.55),(835,486,-8,0.48),(900,460,18,0.52)]
    for x,y,r,sc in jiggle:
        inner += G(tooth(TOOTH,"worried"), x, y, sc, r)
    inner += f'<text x="800" y="590" text-anchor="middle" font-family="Pop" font-size="24" fill="{GUM_D}">ガッタガタ…</text>'
    # Haku rushing center
    inner += qmark(560,150,1.0)
    inner += G(haku(1.0, mood="happy", mag=True), 490, 300, 1.05)
    inner += motion(360,300,3,26,0,MINT_D)
    return scene_wrap(inner, w, h, bg=bg)

def scene_p3():
    w,h = 1000,620
    bg = f'<rect width="{w}" height="{h}" fill="{CREAM}"/>'
    inner = "".join([sparkle(120,120,16), sparkle(900,150,16), sparkle(150,520,14)])
    # big magnifier on the right
    cx, cy, R = 660, 320, 188
    glass = (f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="{SKY}" opacity=".28"/>'
             f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="none" stroke="{OUT}" stroke-width="16"/>'
             f'<circle cx="{cx}" cy="{cy}" r="{R-12}" fill="none" stroke="#fff" stroke-width="4" opacity=".7"/>'
             f'<path d="M{cx-120},{cy-118} q-26,16 -20,46" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".8"/>')
    # culprits caught inside lens
    inside = G(pokan(0.9, flee=False), cx-66, cy-6) + G(bero(0.95), cx+82, cy+30)
    inside += f'<text x="{cx}" y="{cy+150}" text-anchor="middle" font-family="Pop" font-size="22" fill="{GUM_D}">みつかった！</text>'
    # handle down-left toward Haku
    handle = (f'<path d="M{cx-R+18},{cy+R-30} L210,560" stroke="{OUT}" stroke-width="34" stroke-linecap="round"/>'
              f'<path d="M{cx-R+18},{cy+R-30} L210,560" stroke="{HAT}" stroke-width="22" stroke-linecap="round"/>')
    haku_fig = G(haku(0.92, mood="happy", mag=False), 195, 430, 1.0)
    speech = (f'<g transform="translate(250,150)"><rect x="-150" y="-58" width="300" height="96" rx="26" fill="#fff" stroke="{OUT}" stroke-width="6"/>'
              f'<path d="M-70,30 l-22,40 l54,-22 Z" fill="#fff" stroke="{OUT}" stroke-width="6"/>'
              f'<text x="0" y="14" text-anchor="middle" font-family="Pop" font-size="34" fill="{CORAL_D}">犯人はキミか！</text></g>')
    return scene_wrap(glass + inside + handle + haku_fig + speech + inner, w, h, bg=bg)

def scene_p4():
    w,h = 1000,620
    bg = (f'<defs><linearGradient id="m4" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="{MINT_BG}"/>'
          f'<stop offset="100%" stop-color="#fffaf0"/></linearGradient></defs><rect width="{w}" height="{h}" fill="url(#m4)"/>')
    # あいうべ bubbles across top
    bubbles = (mouth_bubble(170,120,"あ",CORAL_D)+mouth_bubble(360,96,"い",MINT_D)
               +mouth_bubble(560,96,"う",SKY_D)+mouth_bubble(760,120,"べ",GUM_D))
    arrows = "".join(f'<path d="M{x},108 q24,16 48,0" fill="none" stroke="{OUT}" stroke-width="4" stroke-linecap="round" opacity=".5" marker="none"/>' for x in [232,452,652])
    sun_ = sun(910,110,0.6)
    haku_fig = G(haku(0.95, mood="joy", mag=False), 300, 420, 1.05)
    myo = G(myobrace(1.0), 560, 430, 1.05)
    myo_label = f'<text x="560" y="540" text-anchor="middle" font-family="Pop" font-size="22" fill="{MINT_D}">マイオブレ</text>'
    # culprits fleeing bottom-right
    flee = G(pokan(0.56, flee=True), 885, 475) + G(bero(0.56), 795, 508) + motion(720,485,4,22,0,SKY_D)
    flee += f'<text x="690" y="560" text-anchor="middle" font-family="Pop" font-size="20" fill="{SKY_D}">たいさ〜ん！</text>'
    return scene_wrap(bubbles + arrows + sun_ + haku_fig + myo + myo_label + flee, w, h, bg=bg)

def scene_p5():
    w,h = 1000,620
    bg = (f'<defs><linearGradient id="s5" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="{SKY_BG}"/>'
          f'<stop offset="100%" stop-color="#fffdfa"/></linearGradient></defs><rect width="{w}" height="{h}" fill="url(#s5)"/>')
    inner = f'<line x1="500" y1="120" x2="500" y2="520" stroke="{SKY_D}" stroke-width="3" stroke-dasharray="8 12" opacity=".5"/>'
    # left: aligner tooth
    inner += G(aligner_tooth(1.15), 235, 320, 1.0)
    inner += f'<text x="235" y="470" text-anchor="middle" font-family="Pop" font-size="26" fill="{SKY_D}">とうめい</text>'
    inner += f'<text x="235" y="505" text-anchor="middle" font-family="Rounded" font-size="20" fill="{INK}">マウスピース</text>'
    # right: wire teeth
    inner += G(wire_teeth(1.0,4), 760, 300)
    inner += f'<text x="760" y="470" text-anchor="middle" font-family="Pop" font-size="26" fill="{MINT_D}">たよれる</text>'
    inner += f'<text x="760" y="505" text-anchor="middle" font-family="Rounded" font-size="20" fill="{INK}">ワイヤー</text>'
    # center Haku presenting
    inner += G(haku(0.7, mood="wink", mag=False), 500, 360, 0.95)
    inner += sparkle(150,140,16)+sparkle(870,150,16)+sparkle(500,540,14)
    return scene_wrap(inner, w, h, bg=bg)

def scene_p6():
    w,h = 1000,470
    bg = (f'<defs><linearGradient id="s6" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="{SKY_BG}"/>'
          f'<stop offset="100%" stop-color="#fef8f1"/></linearGradient></defs><rect width="{w}" height="{h}" fill="url(#s6)"/>')
    inner = sun(120,90,0.62) + cloud(840,80,0.6)
    inner += confetti([(220,60,20),(360,40,15),(640,46,40),(780,70,25),(300,150,10),(720,150,30),(500,40,18),(880,150,12),(140,170,22)])
    inner += gum_street(1300, 320)
    # row waving
    xs = [180,300,500,700,820]
    moods = ["happy","joy","happy","joy","happy"]
    for x,m in zip(xs,moods):
        inner += G(tooth(TOOTH,m), x, 350, 0.5)
    # Haku center waving + gadgets
    inner += G(haku(0.62, mood="joy", mag=False, wave=True), 500, 250, 1.0)
    inner += G(myobrace(0.5), 360, 300) + G(aligner_tooth(0.5), 660, 300)
    inner += otext(500, 122, "じけん かいけつ！", CORAL_D, 42, hw=10)
    return scene_wrap(inner, w, h, bg=bg)

# ---------------- copy ----------------
KICK = {2:"おはなし①・どうにゅう",3:"おはなし②・なぞとき",4:"おはなし③・かいけつ その1",5:"おはなし④・かいけつ その2",6:"おはなし⑤・だいだんえん"}
KID = {
 2:'ここは お口の中の <b>「歯ならびタウン」</b>。歯さんたちは いつも なかよく いちれつ。あれれ？ さいきん ならびが <b>ガッタガタ</b>……。どうして？ ハクちゃんの でばんだ！',
 3:'ハクちゃんが 虫めがねで しらべると……<b>いたいた！</b> いつも お口ポカーンの <b>「ポカンマン」</b>。ベロで歯を ぐいぐい おす <b>「ベロベロ」</b>。なんと、こいつらの <b>“クセ” が 犯人</b> だったんだ！',
 4:'ハクちゃんの <b>ひみつ道具</b>、とうじょう！ やわらかマウスピース <b>「マイオブレ」</b> を パクッ。そして お口のたいそう、<b>「あ・い・う・べ」</b>！ ベロは おうち（上あご）に ぴたっ。お鼻で すー・はー。 クセめ、たいさーん！',
 5:'もっと きれいに ならべるには……<b>とうめい</b>で 目立たない <b>「マウスピース」</b>。いろんな歯ならびに たよれる <b>「ワイヤー」</b>。どっちも ハクちゃんが いっしょ。だから <b>こわくないよ！</b>',
 6:'<b>じけん かいけつ！</b> 歯ならびタウンに <b>ニコニコえがお</b> が もどってきた！ キミの お口も、ハクちゃんと いっしょに まもろうね♪',
}
PARENT = {
 2:'<b>歯ならびは“生えそろってから”では遅いことも。</b>乳歯から永久歯へ生え変わる6〜12歳ごろは、あごが大きく育つ大切な時期。このあいだにスペースが足りなかったり、お口のクセがあると歯ならびは乱れていきます。<b>早く気づくほど、できる選択肢が増えます。</b>',
 3:'<b>歯ならびが乱れる“本当の原因”は、歯ではなくお口のクセ。</b>口呼吸・舌で歯を押す・指しゃぶり・飲み込み方のクセ——こうした口腔習癖があると、あごの成長が妨げられ、歯ならびが乱れます。とくに口呼吸はお口が乾き、むし歯リスクも上昇。原因にアプローチしないと、並べても“後戻り”しやすいのです。',
 4:'<b>マイオブレス × MFT（口腔筋機能療法）＝“原因から治す”小児矯正。</b>マイオブレスは歯を直接動かすのではなく、乱れの原因（口呼吸・舌癖・飲み込み方）を整える取り外し式の装置。日中の短時間＋就寝時に使い、お口のトレーニング（MFT＝舌・くちびる・頬の筋トレ）と組み合わせます。対象は5〜15歳、小学生がベストタイミング。正しい鼻呼吸・舌の位置・飲み込みが身につくと、歯ならびの“土台”が整い、後戻りしにくいのが利点です。',
 5:'<b>歯を並べる仕上げは、お子さまに合わせて2つから。</b><br>● <b>マウスピース矯正</b>（インビザライン・ファースト 等）…透明で目立たず、取り外せるので食事も歯みがきも普段どおり。装着時間を守る自己管理がポイント。<br>● <b>ワイヤー矯正</b>…幅広い歯並びに対応でき、確実に歯を動かせるのが強み。つけっぱなしで管理がラク。生え変わりや症例・生活に合わせてご提案します。',
}

def page_cover():
    return ('<section class="page cover">'
            + scene_cover()
            + '<div class="cv-top"><div class="cv-series">こども きょうせい えほん</div>'
              '<h1 class="cv-title">は探偵ハクちゃん</h1>'
              '<div class="cv-sub">～きえた ニコニコ歯ならびの なぞ～</div></div>'
            + '<div class="cv-teaser">ピカーン！ お口の中で じけん はっせい！？<br>なぞを とくのは……<b>は探偵ハクちゃん！</b></div>'
            + '<div class="cv-foot"><div class="cv-logo">［ 医院名 ／ ロゴ ］</div>'
              '<div class="cv-note">お子さまといっしょに読む、歯ならびのえほん。<br>「うちの子の歯ならび、これで大丈夫？」のヒントは さいごのページに。</div></div>'
            + '</section>')

def page_content(n, scene):
    return (f'<section class="page content">'
            f'<div class="illwrap">{scene}</div>'
            f'<div class="txt"><div class="kicker">{KICK[n]}</div>'
            f'<p class="kid">{KID[n]}</p>'
            f'<div class="parent"><span class="ptag">おうちの方へ</span><span class="ptxt">{PARENT[n]}</span></div>'
            f'</div></section>')

def page_cta():
    info = (f'<div class="ci-row"><span class="ci-k">医院名</span><span class="ci-v">［ 医院名 ］　小児矯正・矯正歯科</span></div>'
            f'<div class="ci-row"><span class="ci-k">アクセス</span><span class="ci-v">［ 住所 ／ 最寄り駅 徒歩○分 ］</span></div>'
            f'<div class="ci-row"><span class="ci-k">ご予約</span><span class="ci-v">☎ ［ 電話番号 ］　／　WEB・LINE ［ QRコード ］</span></div>'
            f'<div class="ci-row"><span class="ci-k">診療時間</span><span class="ci-v">［ 診療時間 ／ 休診日 ］</span></div>'
            f'<div class="ci-row"><span class="ci-k">とくてん</span><span class="ci-v">［ 初回相談・検診 無料 など ］</span></div>')
    return (f'<section class="page cta">'
            f'<div class="illwrap cta-ill">{scene_p6()}</div>'
            f'<div class="txt">'
            f'<p class="kid">{KID[6]}</p>'
            f'<div class="parent cta-box"><span class="ptag coral">おうちの方へ</span>'
            f'<span class="ptxt"><b>早く始めるほど、やさしく整う。</b>子どものうちはあごの成長を味方にできるので、歯を抜かずに並べられる可能性が高く、治療もシンプル。クセから整えるので後戻りもしにくい——これが小児矯正の大きなメリットです。<br>「口がよく開いている」「歯ならびが気になる」と感じたら、まずは <b>無料相談・検診</b> へ。</span></div>'
            f'<div class="clinic">{info}</div>'
            f'<div class="disc">※小児矯正は自由診療です。効果には個人差があり、痛み・違和感・後戻り等を伴う場合があります。費用・期間・リスクは診察時にご説明します。文中の装置名（マイオブレス／インビザライン・ファースト 等）は各社の登録商標です。</div>'
            f'</div></section>')

CSS = """
@font-face{font-family:'Rounded';src:url('fonts/MPLUSRounded1c-Regular.woff2') format('woff2');font-weight:400;font-display:swap;}
@font-face{font-family:'Rounded';src:url('fonts/MPLUSRounded1c-Medium.woff2') format('woff2');font-weight:500;font-display:swap;}
@font-face{font-family:'Rounded';src:url('fonts/MPLUSRounded1c-Bold.woff2') format('woff2');font-weight:700;font-display:swap;}
@font-face{font-family:'Pop';src:url('fonts/MochiyPopOne-Regular.woff2') format('woff2');font-weight:400;font-display:swap;}
@page{ size:A5 portrait; margin:0; }
*{ box-sizing:border-box; margin:0; padding:0; }
html,body{ -webkit-print-color-adjust:exact; print-color-adjust:exact; }
body{ font-family:'Rounded',sans-serif; color:#4b4b5e; background:#cdd8e4; }
.page{ position:relative; width:148mm; height:210mm; overflow:hidden; page-break-after:always; background:#fff; }
.page:last-child{ page-break-after:auto; }
.ill{ display:block; width:100%; height:100%; }
b{ font-weight:700; }

/* cover */
.cover .ill{ position:absolute; inset:0; }
.cv-top{ position:absolute; top:11mm; left:0; right:0; text-align:center; }
.cv-series{ font-family:'Pop'; font-size:10pt; color:#3fb39c; letter-spacing:.18em; margin-bottom:2mm; }
.cv-title{ font-family:'Pop'; font-size:33pt; color:#ef7e6c; line-height:1.1;
           text-shadow:0 2px 0 #fff,0 0 6px rgba(255,255,255,.9); }
.cv-sub{ font-family:'Pop'; font-size:12.5pt; color:#4b4b5e; margin-top:2.5mm; }
.cv-teaser{ position:absolute; left:14mm; right:14mm; top:156mm; text-align:center; font-weight:500;
            font-size:11.5pt; line-height:1.7; color:#4b4b5e;
            background:rgba(255,255,255,.62); border-radius:5mm; padding:3.5mm 4mm; }
.cv-teaser b{ color:#3fb39c; }
.cv-foot{ position:absolute; left:10mm; right:10mm; bottom:8mm; text-align:center; }
.cv-logo{ font-family:'Pop'; font-size:13pt; color:#6b6b7e; background:rgba(255,255,255,.7);
          border:2px dashed #c9b89a; border-radius:5mm; padding:3mm 4mm; display:inline-block; }
.cv-note{ font-size:8pt; color:#7c7c8c; margin-top:3mm; line-height:1.6; }

/* content */
.illwrap{ height:92mm; overflow:hidden; }
.cta-ill{ height:69mm; }
.txt{ padding:5mm 9mm 0; }
.kicker{ font-family:'Pop'; font-size:8.5pt; color:#fff; background:#8fded0; display:inline-block;
         padding:1mm 3.5mm; border-radius:4mm; margin-bottom:3mm; }
.kid{ font-size:13pt; line-height:1.95; font-weight:500; }
.kid b{ color:#3fb39c; font-weight:700; }
.parent{ margin-top:4mm; background:#fff6e6; border:2px solid #efdcb6; border-radius:5mm; padding:4mm 5mm; }
.ptag{ font-family:'Pop'; font-size:7.6pt; color:#fff; background:#8fc7bd; padding:1mm 3mm; border-radius:3mm; margin-right:2mm; }
.ptag.coral{ background:#ef9e8c; }
.ptxt{ font-size:8.5pt; line-height:1.66; color:#5a5560; }
.parent b{ color:#cf6a55; }

/* cta */
.cta .txt{ padding:3.5mm 8mm 0; }
.cta .kid{ font-size:11.5pt; line-height:1.7; text-align:center; }
.cta-box{ margin-top:2.5mm; padding:3mm 4mm; }
.cta-box .ptxt{ font-size:8pt; line-height:1.6; }
.clinic{ margin-top:3mm; border:2px solid #bfe3f2; border-radius:5mm; padding:3mm 4mm; background:#f4fbff; }
.ci-row{ display:flex; gap:3mm; font-size:8.2pt; line-height:1.5; padding:.6mm 0; }
.ci-k{ font-family:'Pop'; font-size:7.4pt; color:#fff; background:#86cbe8; border-radius:2.5mm; padding:.6mm 2.4mm; flex:0 0 19mm; text-align:center; }
.ci-v{ color:#4b4b5e; }
.disc{ margin-top:2.5mm; font-size:6.2pt; line-height:1.45; color:#9a96a0; }
@media screen{ body{ padding:8mm 0; } .page{ margin:0 auto 8mm; box-shadow:0 6px 26px rgba(0,0,0,.18); border-radius:2mm; } }
""".strip()

def build(mode="full"):
    if mode == "sheet":
        from_sheet = True
        body = f'<section class="page">{char_sheet()}</section>'
    else:
        body = (page_cover()
                + page_content(2, scene_p2())
                + page_content(3, scene_p3())
                + page_content(4, scene_p4())
                + page_content(5, scene_p5())
                + page_cta())
    return ("<!doctype html><html lang='ja'><head><meta charset='utf-8'>"
            "<meta name='viewport' content='width=device-width,initial-scale=1'>"
            "<title>は探偵ハクちゃん｜小児矯正えほん</title>"
            f"<style>{CSS}</style></head><body>{body}</body></html>")

def char_sheet():
    inner = ""
    items = [("ハクちゃん", haku(1.0), 165, 210),("ポカンマン", pokan(1.0), 470, 230),("ベロベロ", bero(1.0), 720, 235),
             ("マイオブレ", myobrace(1.0), 165, 470),("とうめいシールド", aligner_tooth(1.0), 410, 460),("ワイヤー隊", wire_teeth(0.85,4), 740, 470)]
    for name, art, x, y in items:
        inner += G(art, x, y) + f'<text x="{x}" y="{y+118}" text-anchor="middle" font-family="Pop" font-size="22" fill="{INK}">{name}</text>'
    return scene_wrap(inner, 1000, 640, bg=f'<rect width="1000" height="640" fill="{CREAM}"/>')

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "full"
    out = sys.argv[2] if len(sys.argv) > 2 else "index.html"
    open(out, "w", encoding="utf-8").write(build(mode))
    print("wrote", out, "mode", mode)
