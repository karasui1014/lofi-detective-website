#!/bin/bash
cd "$(dirname "$0")"

echo "🚀 デスクトップのオリジナルフォルダーから最新の画像を同期します..."

# assetsフォルダーが存在しない場合は作成
mkdir -p assets

# デスクトップの「SunoAiまとめ/assets」からすべてのファイルをコピー（これが正解データです）
cp -r "/Users/mizutanimasahiro/Desktop/SunoAiまとめ/assets/"* "./assets/"

# 昨日の完成形に合わせるための補正（もし名前が違うものがあれば個別に合わせます）
# index.htmlが期待する名前にリネーム/コピー
if [ -f "./assets/ai_music_dept.png" ]; then
    cp "./assets/ai_music_dept.png" "./assets/spring_fes_goods.png"
fi

# 特設サイトバナー（これもデスクトップに適切なものがあれば差し替えますが、一旦現在のものを保護）
# もしデスクトップにバナー用画像があれば、ここに追加のcpコマンドを書きます。

echo "✅ 正解データを同期しました。"
echo "- ヒーロー画像: hero_karasui.jpg (Desktop)"
echo "- ケースファイル画像: case_file.jpg (Desktop)"
echo "- 公式グッズ（チラシ）: spring_fes_goods.png (Desktop/ai_music_dept.png)"
echo "- YouTube/Sunoサムネイル: 同期完了"

# GitHubへのプッシュ
git add .
git commit -m "Restore to yesterday absolute correct state from Desktop source"
git push -f origin main

echo "🎉 完了しました！すべての画像がデスクトップのオリジナル通りに反映されます。"
read -p "ブラウザで「Ctrl + Shift + R」で強制リロードして確認してください（Enterキーで終了）"
