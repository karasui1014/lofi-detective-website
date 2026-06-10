#!/usr/bin/env python3
"""
動画 → SRT字幕ファイル自動生成
使い方:
  python telop.py 動画.mp4              # 通常モード（文字起こしそのまま）
  python telop.py 動画.mp4 --summarize  # 要約モード（1行に凝縮）
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


def summarize_segments(segments: list[dict]) -> list[dict]:
    try:
        import anthropic
    except ImportError:
        print("  anthropicパッケージが必要です: pip3 install anthropic")
        sys.exit(1)

    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        print("  ANTHROPIC_API_KEYが設定されていません")
        print("  export ANTHROPIC_API_KEY=sk-ant-... をターミナルで実行してください")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)
    result = []
    total = len(segments)

    for i, seg in enumerate(segments, 1):
        text = remove_fillers(seg['text'])
        if not text:
            continue

        print(f"  要約中... ({i}/{total})", end='\r')

        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=50,
            messages=[{
                "role": "user",
                "content": (
                    f"次の話し言葉を、動画テロップ用に{MAX_CHARS}文字以内の1行に要約してください。"
                    f"句読点なし、体言止めや短い文で。テキストのみ返してください。\n\n{text}"
                )
            }]
        )
        summarized = message.content[0].text.strip()
        result.append({**seg, 'text': summarized})

    print(f"  要約完了 ✓ ({total}件)          ")
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


def build_srt(segments: list[dict], summarize: bool = False) -> str:
    entries = []
    index = 1
    for seg in segments:
        text = seg['text'] if summarize else remove_fillers(seg['text'])
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
        print("  python telop.py 動画.mp4 --summarize  # 要約モード（1行に凝縮）")
        sys.exit(1)

    video_path = Path(sys.argv[1]).expanduser().resolve()
    summarize = '--summarize' in sys.argv

    if not video_path.exists():
        print(f"ファイルが見つかりません: {video_path}")
        sys.exit(1)

    mode = "要約テロップ" if summarize else "フルテロップ"
    print(f"\n{video_path.name} → {mode}にします\n")

    audio_path = extract_audio(video_path)
    segments = transcribe(audio_path)
    print(f"  完了 ✓ ({len(segments)}セグメント検出)")

    if summarize:
        print(f"  Claude AIで要約中（{MAX_CHARS}文字以内・1行）...")
        segments = summarize_segments(segments)

    print(f"  テロップ用に整形中（{MAX_CHARS}文字前後）...")
    srt_content = build_srt(segments, summarize=summarize)

    suffix = '_要約' if summarize else ''
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
