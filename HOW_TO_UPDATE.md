# ウェブサイト更新マニュアル

このウェブサイトの「INFORMATION（インフォメーション）」やその他の文字を更新する方法のメモです。

## 1. 更新するファイル
デスクトップの `lofi-detective-game` フォルダの中にある **`index.html`** というファイルを編集します。

このファイルを「テキストエディタ（メモ帳など）」や「VS Code」で開いてください。

## 2. インフォメーションの更新方法
ファイルを開いたら、`id="info"` と書かれている場所を探してください（60行目あたりです）。
以下のようなコードが見つかります。

```html
<section id="info" class="content-section">
    <div class="section-header">
        <span class="section-number">01</span>
        <h2>INFORMATION</h2>
    </div>
    <div class="info-container glass-panel">
        <ul class="info-list">
            <!-- ここからリスト -->
            <li>
                <span class="date">2025.11.22</span>
                <span class="tag">Update</span>
                <span class="text">サイトをリニューアルしました。</span>
            </li>
            <!-- ここまでが1つのニュース -->
            ...
        </ul>
    </div>
</section>
```

### 新しいニュースを追加する場合
`<li>` から `</li>` までをコピーして、リストの一番上（`<ul class="info-list">` のすぐ下）に貼り付けます。
そして、中身を書き換えます。

*   `<span class="date">...</span>`: 日付
*   `<span class="tag">...</span>`: タグ（Update, News, Music など）
*   `<span class="text">...</span>`: ニュースの内容

### 内容を修正する場合
既存の文字を直接書き換えてください。

## 3. 公開（デプロイ）の方法
編集が終わったら、**ファイルを「上書き保存」**してください。

その後、ウェブサイトを公開しているサービス（Netlifyなど）に、この `lofi-detective-game` フォルダごと（または `index.html` ファイル）を再度アップロードすれば、更新完了です！
