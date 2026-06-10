#!/usr/bin/env python3
"""
動画 → SRT字幕ファイル自動生成
使い方: python telop.py 動画ファイル.mp4
"""

import sys
import os
import re
import subprocess
import json
from pathlib import Path

FILLERS = [
    r'\bえー+\b', r'\bえっと\b', r'\bあの+\b', r'\bまあ+\b',
    r'\bなんか\b', r'\bそのー*\b', r'\bうーん\b', r'\bんー\b',
    r'\bほんとに\b(?=\s*ほんとに)', r'\bまじ\b(?=\s*まじ)',
]

MAX_CHARS = 17  # テロップ1行あたりの推奨文字数


def extract_audio(video_path: Path) -> Path:
    audio_path = video_path.with_suffix('.wav')
    print(f"  音声を抽出中... → {audio_path.name}")
    result = subprocess.run(
        ['ffmpeg', '-y', '-i', str(video_path), '-ar', '16000', '-ac', '1',
         '-f', 'wav', str(audio_path)],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg失敗:\n{result.stderr[-500:]}")
    return audio_path


def transcribe(audio_path: Path) -> list[dict]:
    print("  音声を聞き取り中...")
    result = subprocess.run(
        [sys.executable, '-m', 'whisper', str(audio_path), '--model', 'small',
         '--language', 'ja', '--output_format', 'json',
         '--output_dir', str(audio_path.parent)],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        raise RuntimeError(f"Whisper失敗:\n{result.stderr[-500:]}")

    json_path = audio_path.with_suffix('.json')
    with open(json_path, encoding='utf-8') as f:
        data = json.load(f)
    return data.get('segments', [])


def remove_fillers(text: str) -> str:
    for pattern in FILLERS:
        text = re.sub(pattern, '', text)
    text = re.sub(r'[、,]\s*[、,]', '、', text)
    text = re.sub(r'\s+', '', text)
    return text.strip()


def split_into_lines(text: str, max_chars: int = MAX_CHARS) -> list[str]:
    """句読点で区切りながらmax_chars以内の行に分割"""
    if len(text) <= max_chars:
        return [text]

    lines = []
    while len(text) > max_chars:
        # 句読点を優先して区切る
        cut = max_chars
        for i in range(max_chars, 0, -1):
            if text[i - 1] in '。、！？!?,. ':
                cut = i
                break
        lines.append(text[:cut])
        text = text[cut:].lstrip()
    if text:
        lines.append(text)
    return lines


def seconds_to_srt_time(s: float) -> str:
    h = int(s // 3600)
    m = int((s % 3600) // 60)
    sec = int(s % 60)
    ms = int(round((s - int(s)) * 1000))
    return f"{h:02d}:{m:02d}:{sec:02d},{ms:03d}"


def build_srt(segments: list[dict]) -> str:
    entries = []
    index = 1
    for seg in segments:
        text = remove_fillers(seg['text'])
        if not text:
            continue
        lines = split_into_lines(text)
        start = seconds_to_srt_time(seg['start'])
        end = seconds_to_srt_time(seg['end'])
        entries.append(f"{index}\n{start} --> {end}\n{chr(10).join(lines)}\n")
        index += 1
    return '\n'.join(entries)


def main():
    if len(sys.argv) < 2:
        print("使い方: python telop.py <動画ファイル>")
        sys.exit(1)

    video_path = Path(sys.argv[1]).expanduser().resolve()
    if not video_path.exists():
        print(f"ファイルが見つかりません: {video_path}")
        sys.exit(1)

    print(f"\n{video_path.name} → フルテロップにします\n")

    audio_path = extract_audio(video_path)

    segments = transcribe(audio_path)
    print(f"  完了 ✓ ({len(segments)}セグメント検出)")

    print(f"  テロップ用に整形中（{MAX_CHARS}文字前後）...")
    srt_content = build_srt(segments)

    srt_path = video_path.with_suffix('.srt')
    srt_path.write_text(srt_content, encoding='utf-8')

    # 一時ファイルを削除
    for ext in ['.wav', '.json', '.txt', '.tsv', '.vtt']:
        tmp = audio_path.with_suffix(ext)
        if tmp.exists():
            tmp.unlink()

    print(f"\n完了 ✓ → {srt_path}")
    print(f"   {len(srt_content.splitlines())} 行のSRTファイルを生成しました\n")


if __name__ == '__main__':
    main()
