#!/usr/bin/env python3
"""
動画 → SRT字幕ファイル自動生成
使い方:
  python telop.py 動画.mp4              # 通常モード（文字起こしそのまま）
  python telop.py 動画.mp4 --summarize  # 要約モード（無料・ローカル圧縮）
"""

import sys
import os
import re
import subprocess
import json
from pathlib import Path

FILLERS = [
    r'えー+', r'えっと', r'あのー*', r'まあ+', r'なんか',
    r'そのー*', r'うーん', r'んー', r'ねー*', r'よー*(?=\s)',
]

# 文末の冗長表現 → 体言止めに変換するルール
ENDINGS = [
    (r'することができます', 'できる'),
    (r'していきたいと思います', 'していく'),
    (r'していきます', 'していく'),
    (r'したいと思います', 'したい'),
    (r'と思っています', 'と思う'),
    (r'と思います', 'と思う'),
    (r'ということです', 'とのこと'),
    (r'ということになります', 'となる'),
    (r'になります', 'になる'),
    (r'ています', 'てる'),
    (r'ておきます', 'ておく'),
    (r'てください', 'てほしい'),
    (r'ましょう', 'しよう'),
    (r'でしょう', 'だろう'),
    (r'ですね', ''),
    (r'ですよ', ''),
    (r'ですが', 'だが'),
    (r'です。', ''),
    (r'です$', ''),
    (r'ます。', ''),
    (r'ます$', ''),
    (r'ました。', ''),
    (r'ました$', ''),
    (r'。$', ''),
]

MAX_CHARS = 20


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


def compress_local(text: str) -> str:
    """無料・ローカルでテキストを短縮する"""
    text = remove_fillers(text)

    # 文末を体言止めに変換
    for pattern, replacement in ENDINGS:
        text = re.sub(pattern, replacement, text)

    # 重複表現を除去
    text = re.sub(r'(.{2,})\1', r'\1', text)

    # 句読点を整理
    text = re.sub(r'[、。]+$', '', text)
    text = re.sub(r'\s+', '', text)

    # MAX_CHARSを超える場合は自然な区切りで切る
    if len(text) > MAX_CHARS:
        for i in range(MAX_CHARS, MAX_CHARS // 2, -1):
            if text[i - 1] in 'はがをにでもとやへのから':
                text = text[:i - 1]
                break
        else:
            text = text[:MAX_CHARS]

    return text.strip()


def compress_segments(segments: list[dict]) -> list[dict]:
    result = []
    total = len(segments)
    for i, seg in enumerate(segments, 1):
        print(f"  圧縮中... ({i}/{total})", end='\r')
        compressed = compress_local(seg['text'])
        if compressed:
            result.append({**seg, 'text': compressed})
    print(f"  圧縮完了 ✓ ({total}件)          ")
    return result


def split_into_lines(text: str, max_chars: int = MAX_CHARS) -> list[str]:
    if len(text) <= max_chars:
        return [text]

    lines = []
    while len(text) > max_chars:
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


def build_srt(segments: list[dict], compressed: bool = False) -> str:
    entries = []
    index = 1
    for seg in segments:
        text = seg['text'] if compressed else remove_fillers(seg['text'])
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
        print("使い方:")
        print("  python telop.py 動画.mp4              # 通常モード")
        print("  python telop.py 動画.mp4 --summarize  # 圧縮モード（無料・1行に凝縮）")
        sys.exit(1)

    video_path = Path(sys.argv[1]).expanduser().resolve()
    summarize = '--summarize' in sys.argv

    if not video_path.exists():
        print(f"ファイルが見つかりません: {video_path}")
        sys.exit(1)

    mode = "圧縮テロップ（無料）" if summarize else "フルテロップ"
    print(f"\n{video_path.name} → {mode}にします\n")

    audio_path = extract_audio(video_path)
    segments = transcribe(audio_path)
    print(f"  完了 ✓ ({len(segments)}セグメント検出)")

    if summarize:
        print(f"  ローカルで圧縮中（{MAX_CHARS}文字以内・1行）...")
        segments = compress_segments(segments)

    print(f"  テロップ用に整形中...")
    srt_content = build_srt(segments, compressed=summarize)

    suffix = '_圧縮' if summarize else ''
    srt_path = video_path.with_stem(video_path.stem + suffix).with_suffix('.srt')
    srt_path.write_text(srt_content, encoding='utf-8')

    for ext in ['.wav', '.json', '.txt', '.tsv', '.vtt']:
        tmp = audio_path.with_suffix(ext)
        if tmp.exists():
            tmp.unlink()

    print(f"\n完了 ✓ → {srt_path}")
    print(f"   {len(srt_content.splitlines())} 行のSRTファイルを生成しました\n")


if __name__ == '__main__':
    main()
