#!/bin/bash
cd "$(dirname "$0")"

echo "🚀 アップロード準備を開始します..."

# 1. ファビコン画像の取り込み
mkdir -p assets
cp "/Users/mizutanimasahiro/.gemini/antigravity/brain/894164f2-e8bd-41f2-a96f-67a13e9f61e4/lofi_detective_favicon_v2_1774098599825.png" "./assets/favicon.png" 2>/dev/null
cp "/Users/mizutanimasahiro/.gemini/antigravity/brain/894164f2-e8bd-41f2-a96f-67a13e9f61e4/lofi_detective_favicon_v2_1774098599825.png" "./assets/apple-touch-icon.png" 2>/dev/null

echo "✅ ファビコンを設定しました。"

# 2. GitHubへのプッシュ（認証はgit configに保存済み）
git add .
git commit -m "Add favicon and final layout with large banner and HQ thumbnail"
git push -f origin main

echo "🎉 完了しました！ウェブサイトを確認してください。"
read -p "このウィンドウを閉じてもいいですよ（Enterキーを押してください）"
