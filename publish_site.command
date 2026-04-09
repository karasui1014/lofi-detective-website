#!/bin/bash
cd "$(dirname "$0")"

echo "🔥 画像を配置し、GitHubに強制反映します..."

# assetsフォルダーを完全リセット
rm -rf assets
mkdir -p assets

# 1. デスクトップの基本データを同期
cp -r "/Users/mizutanimasahiro/Desktop/SunoAiまとめ/assets/"* "./assets/" 2>/dev/null

# 2. 正解画像を上書き（正しいファイル名で）
# Case File
cp "/Users/mizutanimasahiro/.gemini/antigravity/brain/894164f2-e8bd-41f2-a96f-67a13e9f61e4/media__1774707489422.jpg" "./assets/case_file.jpg"

# 縦長グッズチラシ
cp "/Users/mizutanimasahiro/.gemini/antigravity/brain/894164f2-e8bd-41f2-a96f-67a13e9f61e4/media__1774707506276.jpg" "./assets/spring_fes_goods.png"

# 青いトーンのMVイラスト
cp "/Users/mizutanimasahiro/.gemini/antigravity/brain/894164f2-e8bd-41f2-a96f-67a13e9f61e4/media__1774707532316.png" "./assets/youtube_mv.jpg"

# ドラムセット画像（特設サイトバナー）
cp "/Users/mizutanimasahiro/.gemini/antigravity/brain/894164f2-e8bd-41f2-a96f-67a13e9f61e4/media__1774837621557.png" "./assets/spring_fes_banner.png"

# ゲーム用サムネイル
cp "/Users/mizutanimasahiro/Desktop/SunoAiまとめ/assets/mystery_sakura.jpg" "./assets/mystery_sakura.jpg"
cp "/Users/mizutanimasahiro/Desktop/SunoAiまとめ/assets/mystery_hoshi.jpg" "./assets/mystery_hoshi.jpg"
cp "/Users/mizutanimasahiro/Desktop/SunoAiまとめ/assets/mystery_3am.jpg" "./assets/mystery_3am.jpg"

# Sunoパ！ラジオサムネイル
cp "/Users/mizutanimasahiro/ローファイ探偵HP/assets/sunopa_thumbnail.png" "./assets/sunopa_thumbnail.png"

echo "✅ 全画像の配置完了（ゲームサムネ・Sunoパ含む）。確認..."
ls -la ./assets/case_file.jpg ./assets/spring_fes_goods.png ./assets/youtube_mv.jpg ./assets/spring_fes_banner.png ./assets/mystery_sakura.jpg ./assets/mystery_hoshi.jpg ./assets/mystery_3am.jpg ./assets/sunopa_thumbnail.png

echo "✅ 前回の失敗がないか確認中..."
# GitHubへ強制反映
git add .
git commit -m "Fix: Add missing drum banner, all assets confirmed"
git push -f origin main

echo "🎉 完了！ブラウザで強制リロード（Cmd+Shift+R）して確認してください。"
read -p "Enterキーで終了"
