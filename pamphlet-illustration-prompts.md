# なんばエッセ歯科 パンフレット 挿絵プロンプト集

各ページの挿絵エリアに配置する画像の生成プロンプトです。
Midjourney / Stable Diffusion / DALL-E 3 / Adobe Firefly などで使用できます。

---

## 共通スタイル指定（全ページ共通で末尾に追加する）

```
watercolor picture book illustration style, soft pastel colors,
kawaii Japanese children's book aesthetic, warm and friendly,
white background, clean lines, gentle shadows,
mint green and soft pink and warm yellow color palette,
cute chibi characters, high quality, detailed
```

---

## 【キャラクター設定】ハピちゃん（全ページ共通キャラ）

ハピちゃんは以下の設定で統一してください：

```
Happi-chan mascot character: cute chubby tooth fairy character,
pure white rounded tooth shape body, big sparkling round eyes,
small cute smile, tiny arms and legs, rosy cheeks,
wearing a small light mint green star crown,
adorable kawaii style, friendly expression
```

---

## 挿絵 P1（表紙）

**配置**: 中央メイン（140mm × 88mm）

**内容**: ハピちゃんと子供たちが笑顔で手を振っているシーン

```
[Prompt]
Happi-chan (cute white tooth fairy with big eyes and tiny crown)
waving cheerfully alongside 3 happy Japanese children aged 4-8,
boy and girls smiling and waving, colorful balloons in background,
standing in front of a bright friendly dental clinic entrance,
soft pink and mint green background with sparkles and stars,
watercolor picture book illustration, pastel colors, kawaii style,
warm welcoming atmosphere, horizontal composition
```

**サイズ推奨**: 1400 × 880px （横長）

---

## 挿絵 P2（キャラクター紹介）

**配置**: 左カラム（タテ長）

**内容**: ハピちゃんのキャラクターポスター風全身イラスト

```
[Prompt]
Full body character illustration of Happi-chan,
cute chubby white tooth fairy mascot character,
big sparkly round eyes, small smile, rosy cheeks,
wearing tiny mint green star crown,
hands raised up in a cheerful waving pose,
soft gradient background of mint green to light pink,
small decorative stars and hearts around the character,
character sheet / mascot poster style,
kawaii Japanese illustration, clean lines, pastel colors,
vertical portrait composition
```

**サイズ推奨**: 600 × 900px （縦長）

---

## 挿絵 P3（エッセキッズクラブ）

**配置**: 下部横長バナー

**内容**: ハピちゃんと複数の子供たちが歯ブラシを持って笑顔で並ぶ

```
[Prompt]
Happi-chan (white tooth fairy mascot) and 4 happy Japanese children
ages 3-10, all holding colorful toothbrushes and smiling brightly,
standing in a row together like a club photo,
children wearing casual cute clothes in pink, yellow, mint colors,
warm sunny background with stars and sparkles,
watercolor children's book illustration style,
pastel rainbow colors, cheerful and energetic mood,
wide horizontal banner composition
```

**サイズ推奨**: 1400 × 500px（横長ワイド）

---

## 挿絵 P4（むし歯ゼロへの道）

**配置**: 左カラム（正方形気味）

**内容**: ハピちゃんが歯ブラシを持ってピースサインをしているシーン

```
[Prompt]
Happi-chan (cute white tooth fairy mascot) holding an oversized
colorful toothbrush triumphantly, making a peace sign ✌️,
happy victorious expression, sparkles around,
background shows healthy white shining teeth motif,
mint green and yellow color scheme,
feeling of "cavity zero achievement!", celebratory mood,
kawaii watercolor illustration style, vertical composition
```

**サイズ推奨**: 600 × 680px

---

## 挿絵 P5（抜かない矯正）

**配置**: 左カラム（縦長）

**内容**: 矯正トレーニングルームでハピちゃんと子供が楽しく練習

```
[Prompt]
Happi-chan (white tooth fairy) and a Japanese child age 7 doing
fun orthodontic jaw training exercises together,
sitting at a child-friendly colorful clinic room,
child smiling and opening mouth wide in a playful way,
bright and cheerful sky-blue clinic room with cute decorations,
toy blocks and stars decorating the room,
feeling like a game rather than a medical procedure,
warm and reassuring atmosphere, kawaii picture book style,
soft blue and mint color palette, vertical composition
```

**サイズ推奨**: 580 × 800px （縦長）

---

## 挿絵 P6（裏表紙）

**配置**: 上部ワイドバナー

**内容**: ハピちゃんと家族（父・母・子供）が手をつないでクリニックへ向かう

```
[Prompt]
Warm heartwarming scene: Happi-chan (white tooth fairy mascot)
leading a happy Japanese family — father, mother, and young child
age 5 — walking hand-in-hand toward a bright friendly dental clinic,
sunset warm lighting, cherry blossoms or flowers in background,
family smiling with anticipation and joy,
gentle watercolor illustration style,
warm golden hour lighting with mint green accents,
nostalgic and touching picture-book atmosphere,
wide horizontal composition, high quality
```

**サイズ推奨**: 1400 × 680px（横長ワイド）

---

## 使用方法メモ

### Midjourney の場合
上記プロンプトの末尾に以下を追加：
```
--ar 16:9  （横長の場合）
--ar 2:3   （縦長の場合）
--style raw --stylize 600 --v 6
```

### DALL-E 3 / Adobe Firefly の場合
プロンプトをそのままペーストしてください。
スタイルオプションで「水彩」または「イラスト」を選択すると雰囲気が統一されます。

### 画像配置の注意
- 各挿絵は `pamphlet.html` の `【挿絵 Pn】` のテキストがある灰色エリアに差し替えてください
- HTMLの `<div class="illust-area">` などを `<img src="illust-p1.png" ...>` に置換します
- 印刷時は解像度 **300dpi以上** を推奨します

---

*© なんばエッセ歯科・小児歯科クリニック — パンフレット制作用資料*
