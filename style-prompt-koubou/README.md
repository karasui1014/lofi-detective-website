# スタイルプロンプト工房

歌詞を入れて、選択式でポチポチ選ぶだけで、AI音楽生成(Suno対応)の**高精度スタイルプロンプト**を自動生成する無料Webツール。
※非公式のファン制作ツールです。「Suno」はSuno, Inc.の商標です。

## 特徴

- **前半重視(フロントロード)の最適語順** ── Sunoはスタイル欄の前半(特に先頭タグ)を最も強く反映するため、「ジャンル → ムード → ボーカル → BPM → 調 → 拍子」の順で曲の核を前寄せして出力
- **選択式で作り込み** ── ジャンル30種 / ムード20種 / ボーカル・声質 / テンポ・BPM数値指定 / 調(感情の指紋つき) / 変拍子(5/4・7/8ほか) / 楽器38種 / 仕上がり・年代感・展開
- **人気レシピ12種** ── コミュニティ定番の組み合わせをワンタップで読み込み
- **相談モード** ── 5つの質問に答えると足りない要素を自動補完
- **歌詞分析** ── 歌詞の情景ワードからムード・ジャンルを提案/セクションタグ([Verse][Chorus])自動付与
- **セクション演出** ── Bメロから変拍子、サビで転調/ドロップなど、曲の途中の仕掛けを各セクション最大3つまで指定
- **Suno実例に基づく歌詞メタタグ** ── 冒頭に`[Mood: ]` `[Energy: ]` `[Instrument: ]`、各セクションに`[Chorus | Key Change]`のような短い認識タグを自動生成(長い説明文を歌詞欄に置くと歌われてしまう事故を避ける設計)
- **ミス防止** ── 矛盾ムード検知・BPMとジャンルのミスマッチ警告・タグ数/文字数メーター(上限1000字)
- **Exclude Styles(除外スタイル)も自動提案**
- **完全ローカル動作** ── 入力内容は端末外に送信されません(PWA・オフライン対応)

## 使い方(ローカル確認)

`ローカルで確認.command` をダブルクリック → ブラウザで http://localhost:8944 が開きます。

## ファイル構成

| ファイル | 役割 |
| --- | --- |
| `index.html` | 画面 |
| `style.css` | デザイン(ネイビー×ゴールド) |
| `data.js` | ナレッジベース(ジャンル・楽器・レシピ・ルール) |
| `style-dictionary.js` | スタイルプロンプト辞典のデータ(01〜05) |
| `instrument-techniques.js` | 楽器・奏法のデータ(楽器117種・Suno V6表現) |
| `app.js` | プロンプト生成ロジック |
| `techniques.js` | タブ切り替え + スタイルプロンプト辞典のロジック |
| `manifest.webmanifest` / `sw.js` | PWA(ホーム画面追加・オフライン) |
| `favicon.ico` / `favicon-16/32.png` | ファビコン |
| `apple-touch-icon.png` / `icon-192/512.png` | スマホアプリアイコン |
| `make_icons.py` / `アイコン再生成.command` | 別画像からアイコン一式を再生成 |

## スタイルプロンプト辞典のデータを足す

辞典は2つのファイルに分かれています。**出どころが違うので混ぜません。**

| ファイル | sourceType | 中身 |
| --- | --- | --- |
| `style-dictionary.js` | `style-dictionary` | 01〜05のスタイル用語 |
| `instrument-techniques.js` | `v6-instrument-expression` | Suno V6が出力した楽器・奏法表現 |

**大原則: `englishPrompt` / `originalPrompt` は元データそのまま。言い換えない。**
改善版を作る場合は元を残したまま `verifiedPrompt` に入れます。

### カテゴリーを足す(06〜09)

`style-dictionary.js` の `STYLE_DICT_CATEGORIES` に1行足すだけです。画面側は触りません。

```js
{ id: "arrangement", no: "06", ja: "アレンジ", en: "Arrangement", desc: "構成・展開" }
```

### 用語を足す

`STYLE_DICT_ENTRIES` に追記します。

```js
{
  id: "bittersweet-longing",          // ユニークな英小文字ID
  category: "rhythm-mood",            // STYLE_DICT_CATEGORIES の id
  englishPrompt: "bittersweet longing",  // ← 元データ。変更しない
  japaneseName: "ビタースイート・ロンギング",
  meaning: "明るさの中に残る切ない憧れ・恋しさ。",
  recommendations: ["bright major key と好相性"],   // 本文中の登録済み用語は自動でリンクになる
  cautions: ["切なさが強すぎると暗い印象になるので注意"],
  relatedPrompts: ["bright major key"],             // 本文に出てこない関連はここへ
  tags: ["切ない","明るい","エモい","j-pop"],        // 擬音・雰囲気・ジャンル・楽器なんでも
  sourceType: "style-dictionary",
  verificationStatus: "reference",    // 検証したら "verified"
  verifiedPrompt: "", verificationNote: "", recommendedModifiers: [], testedModel: "", testedDate: ""
}
```

**同じ用語を2カテゴリーに登録しないでください。** 1カテゴリーに置き、関係は `tags` で表します。
検索はカテゴリーをまたいで当たるので、それで拾えます。
(例: `brushed snare backbeat` は `rhythm-mood` に置き、tags に `drums` / `snare` / `groove`)

`relatedPrompts` や本文に書いた用語は、**登録済みなら自動でリンク**になり、未登録なら普通の文字のまま残ります。あとからデータを足せば自動でリンクに変わります。

## 楽器・奏法のデータを足す

データは `instrument-techniques.js` の1ファイルに集約しています。画面側のコードは触らなくて構いません。

**大原則: `originalPrompt` は Suno V6 が使った英語表現そのまま。読みやすく言い換えない。**
ここを直すと「Sunoが実際にどう言語化しているか見る」というこの機能の意味が無くなります。

奏法を1件足すときは、`TECHNIQUE_ENTRIES` に追記します。

```js
{
  instrumentId: "trombone",              // TECHNIQUE_INSTRUMENTS の id
  technique: "Glissando",                // 見出し(表示用・追加してよい)
  techniqueJa: "グリッサンド",             // 同上
  originalPrompt: "breath-supported glissando between two neighboring pitches",  // ← 元データ。変更禁止
  descriptionJa: "…",                    // 説明(表示用・追加してよい)
  soundDescriptionJa: "…",               // どんな音か(表示用・追加してよい)
  searchTags: ["うにょ","滑る","glissando","トロンボーン"],  // 擬音検索用(表示用・追加してよい)
  source: "Suno V6 expression",
  verificationStatus: "unverified",      // 検証したら "verified"
  verifiedPrompt: "", verificationNote: "", recommendedModifiers: [],
  testedModel: "", testedDate: "", rating: null, exampleAudio: "",
  premium: false
}
```

楽器が一覧に無ければ `TECHNIQUE_INSTRUMENTS` に足します(`category` は `TECHNIQUE_CATEGORIES` の id)。

**検証済みにするとき**は `verificationStatus` を `"verified"` にし、`verifiedPrompt` / `verificationNote` / `testedModel` を埋めます。
`originalPrompt` と `verifiedPrompt` は画面上でも別枠で並べます。**片方をもう片方に寄せて上書きしないでください。**

データを更新したら `sw.js` の `CACHE` の版数を上げてください(上げないと閲覧者に反映されません)。

## プロンプト設計の根拠(2026年リサーチ)

- 先頭タグの影響が最大。ジャンル→ムード→ボーカル→楽器→プロダクション→テンポの順が定石
- タグは5〜12個が最適。15個超は後半が無視されやすい
- スタイル欄の上限は約1000字(v4.5以降)。コアは前半200字に収める
- BPMは数字指定が有効(v5.5でより正確に追従)
- 矛盾タグ(aggressive×peaceful等)は相殺される
- 変拍子は「7/8 time」+グルーヴ記述の併用が有効

## 公開について

`公開手順.md` を参照。
