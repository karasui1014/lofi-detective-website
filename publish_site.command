#!/bin/bash
cd "$(dirname "$0")"

echo "🔥 正しいファイル名で画像を配置し、GitHubに強制反映します..."

# assetsフォルダーを完全リセット
rm -rf assets
mkdir -p assets

# 1. デスクトップの基本データを同期
cp -r "/Users/mizutanimasahiro/Desktop/SunoAiまとめ/assets/"* "./assets/" 2>/dev/null

# 2. 【正しいファイル名】でご提示の3枚の正解画像を上書き
# 実写女性（ベージュ背景） → Hero & Case File
cp "/Users/mizutanimasahiro/.gemini/antigravity/brain/894164f2-e8bd-41f2-a96f-67a13e9f61e4/media__1774707489422.jpg" "./assets/hero_karasui.jpg"
cp "/Users/mizutanimasahiro/.gemini/antigravity/brain/894164f2-e8bd-41f2-a96f-67a13e9f61e4/media__1774707489422.jpg" "./assets/case_file.jpg"

# 縦長グッズチラシ → Goods
cp "/Users/mizutanimasahiro/.gemini/antigravity/brain/894164f2-e8bd-41f2-a96f-67a13e9f61e4/media__1774707506276.jpg" "./assets/spring_fes_goods.png"

# 青いトーンのMVイラスト → YouTube MV
cp "/Users/mizutanimasahiro/.gemini/antigravity/brain/894164f2-e8bd-41f2-a96f-67a13e9f61e4/media__1774707532316.png" "./assets/youtube_mv.jpg"

echo "✅ 正解画像の配置が完了しました。"

# 3. 確認
echo "--- 配置されたファイル ---"
ls -la ./assets/hero_karasui.jpg ./assets/case_file.jpg ./assets/spring_fes_goods.png ./assets/youtube_mv.jpg

# 4. GitHubへ強制反映
git add .
git commit -m "Rebuild: Correct filenames, new Spring FES link, layout fix"
git push -f origin main

echo "🎉 完了しました！ブラウザで強制リロード（Cmd+Shift+R）して確認してください。"
read -p "Enterキーで終了"
