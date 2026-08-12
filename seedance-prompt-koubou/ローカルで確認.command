#!/bin/bash
# ローカルでシーダンス2.5プロンプト工房を起動します
cd "$(dirname "$0")"
open "http://localhost:8941"
python3 -m http.server 8941
