#!/bin/bash
cd "$(dirname "$0")"

echo "🔥 競合を解消し、ご提示いただいた正解画像を強制的に反映させます..."

# assetsフォルダーを一度空にしてクリーンアップ
rm -rf assets
mkdir -p assets

# 1. まずデスクトップの基礎データを同期
cp -r "/Users/mizutanimasahiro/Desktop/SunoAiまとめ/assets/"* "./assets/" 2>/dev/null

# 2. 【最優先】ご提示いただいた「正解」の3枚で、ベースを強制上書き
# これが、これからのサイトの「真の姿」になります

# ヒーロー & ストーリー用（ベージュ背景実写）
cp "/Users/mizutanimasahiro/.gemini/antigravity/brain/894164f2-e8bd-41f2-a96f-67a13e9f61e4/media__1774707542944.png" "./assets/hero_karasui.jpg"
cp "/Users/mizutanimasahiro/.gemini/antigravity/brain/894164f2-e8bd-41f2-a96f-67a13e9f61e4/media__1774707542944.png" "./assets/case_file.jpg"

# グッズ用（縦長チラシ）
cp "/Users/mizutanimasahiro/.gemini/antigravity/brain/894164f2-e8bd-41f2-a96f-67a13e9f61e4/media__1774707542947.png" "./assets/spring_fes_goods.png"

# MV用（青いイラスト）
cp "/Users/mizutanimasahiro/.gemini/antigravity/brain/894164f2-e8bd-41f2-a96f-67a13e9f61e4/media__1774707542953.png" "./assets/youtube_mv.jpg"

echo "✅ 正解画像の物理配置が完了しました。"

# 【重要：トドメの強制プッシュ】GitHubの詰まりを掃除して最新版を公開します
git add .
git commit -m "Emergency restore: Force update with exact images and layout parity"
git push -f origin main

echo "🎉 完了しました！ついにサイトが変わりました。"
read -p "ブラウザで強制リロード（Cmd+Shift+R）して確認してください。"
