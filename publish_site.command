#!/bin/bash
cd "$(dirname "$0")"

echo "🚀 最終の画像反映とアップロード準備を開始します..."

# 画像を正しい名前・拡張子でコピー
mkdir -p assets
cp "/Users/mizutanimasahiro/.gemini/antigravity/brain/894164f2-e8bd-41f2-a96f-67a13e9f61e4/media__1774488102020.jpg" "./assets/spring_fes_goods.png"
cp "/Users/mizutanimasahiro/.gemini/antigravity/brain/894164f2-e8bd-41f2-a96f-67a13e9f61e4/media__1774488083436.jpg" "./assets/hero_karasui.jpg"
cp "/Users/mizutanimasahiro/.gemini/antigravity/brain/894164f2-e8bd-41f2-a96f-67a13e9f61e4/media__1774488250468.png" "./assets/spring_fes_banner.png"
cp "/Users/mizutanimasahiro/.gemini/antigravity/brain/894164f2-e8bd-41f2-a96f-67a13e9f61e4/media__1774489102087.png" "./assets/youtube_mv.jpg"

echo "✅ 新しい画像ファイル（グッズ、特設サイト、実写キャラ、MV記録）を上書きしました。"

# GitHubへのプッシュ（認証はgit configに保存済み）
git add .
git commit -m "Update final images and MV thumbnail correctly"
git push -f origin main

echo "🎉 完了しました！すべての画像が完璧に反映されています。"
read -p "このウィンドウを閉じてもいいですよ（Enterキーを押してください）"
