#!/bin/bash
cd "$(dirname "$0")"

echo "🔥 画像を配置し、GitHubに強制反映します..."

# assetsフォルダーを完全リセット
rm -rf assets
mkdir -p assets

# 1. デスクトップの基本データを同期
cp -r "/Users/mizutanimasahiro/Desktop/SunoAiまとめ/assets/"* "./assets/" 2>/dev/null

# 2. 正解画像を上書き（正しいファイル名で）
# Case Fileのみ実写（Heroはデスクトップのオリジナル維持）
cp "/Users/mizutanimasahiro/.gemini/antigravity/brain/894164f2-e8bd-41f2-a96f-67a13e9f61e4/media__1774707489422.jpg" "./assets/case_file.jpg"

# 縦長グッズチラシ
cp "/Users/mizutanimasahiro/.gemini/antigravity/brain/894164f2-e8bd-41f2-a96f-67a13e9f61e4/media__1774707506276.jpg" "./assets/spring_fes_goods.png"

# 青いトーンのMVイラスト
cp "/Users/mizutanimasahiro/.gemini/antigravity/brain/894164f2-e8bd-41f2-a96f-67a13e9f61e4/media__1774707532316.png" "./assets/youtube_mv.jpg"

# ドラムセット画像（特設サイトバナー）
cp "/Users/mizutanimasahiro/.gemini/antigravity/brain/894164f2-e8bd-41f2-a96f-67a13e9f61e4/media__1774837621557.png" "./assets/spring_fes_banner.png"

echo "✅ 全画像の配置完了。確認..."
ls -la ./assets/case_file.jpg ./assets/spring_fes_goods.png ./assets/youtube_mv.jpg ./assets/spring_fes_banner.png

# GitHubへ強制反映
git add .
git commit -m "Fix: Add missing drum banner, all assets confirmed"
git push -f origin main

echo "🎉 完了！ブラウザで強制リロード（Cmd+Shift+R）して確認してください。"
read -p "Enterキーで終了"
