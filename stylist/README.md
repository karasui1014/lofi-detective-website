# 顔タイプ × パーソナルカラー スタイリスト（AI診断）

写真をアップロードすると Claude（Vision）が顔タイプ・パーソナルカラーを診断し、
似合う服のおすすめ検索＆試着（はめ込み）ができるツールです。

- **診断**: Claude（`claude-opus-4-8`, 構造化JSON出力）
- **試着**: ブラウザ内 canvas（画像はサーバーに保存しません）
- **APIキー**: サーバーレス関数の環境変数に保管。ブラウザには出ません。

```
stylist/
  public/         フロント（HTML/CSS/JS）
  functions/api/  Cloudflare Pages Functions（本番のAPI）
  shared/         診断ロジック（関数とローカルサーバで共用）
  server/         ローカル開発用 Node サーバ
```

---

## 本番デプロイ: Cloudflare Pages（無料・スリープなし・おすすめ）

リクエストが来たときだけ関数が起動するので、**常時起動サーバ不要＝スリープなし**。無料枠で十分動きます。

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. リポジトリ `karasui1014/lofi-detective-website` を選択
3. ビルド設定:
   - **Root directory（プロジェクトのルート）**: `stylist`
   - **Build command**: `npm install`
   - **Build output directory**: `public`
   （`stylist/wrangler.toml` により出力先と Node 互換フラグは自動適用されます）
4. **Settings → Variables and Secrets** で **`ANTHROPIC_API_KEY`** を追加（Secret 推奨）
   - 任意で `STYLIST_MODEL`（例 `claude-sonnet-4-6` にすると安価）
5. **Save and Deploy** → 数十秒で `https://<project>.pages.dev` が公開されます

> キーを変えたら **Deployments → Retry deployment** で反映してください。

### 動作確認
- `https://<project>.pages.dev/api/health` → `{"ok":true,"hasKey":true}` ならキー認識OK

---

## ローカル開発

### 方法A: Node サーバ（手軽）
```bash
cd stylist
cp .env.example .env      # ANTHROPIC_API_KEY=... を記入
npm install
npm start                 # → http://localhost:3000
```

### 方法B: Cloudflare をローカル再現（本番と同じ関数を実行）
```bash
cd stylist
cp .dev.vars.example .dev.vars   # ANTHROPIC_API_KEY=... を記入
npm install
npm run dev:cf                    # npx wrangler pages dev
```

---

## コスト

1回の診断 = Vision呼び出し1回。`STYLIST_MODEL` で品質/コストを調整できます。
- `claude-opus-4-8`（既定）: 最も的確
- `claude-sonnet-4-6`: 安価で十分実用

ホスティング自体（Cloudflare Pages）は無料。費用はAnthropicのAPI利用分のみです。

---

## 注意
顔タイプ・パーソナルカラーはAIによる推定です。写真の明るさ・角度で結果は変わります。あくまで目安としてお楽しみください。
