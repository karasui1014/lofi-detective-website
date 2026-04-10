#!/bin/bash
cd "$(dirname "$0")"
mkdir -p assets
echo "📦 画像資産を復元しています..."

# Sunoパ！ラジオ告知画像
cp "/Users/mizutanimasahiro/.gemini/antigravity/brain/894164f2-e8bd-41f2-a96f-67a13e9f61e4/media__1775704174314.png" "./assets/sunopa_thumbnail.png"

# その他マスター資産の確認
ls -l ./assets/sunopa_thumbnail.png

echo "✅ 配置完了しました。publish_site.command を実行して公開してください。"
read -p "Enterキーで終了"
