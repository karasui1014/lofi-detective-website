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
    r'えー+', r'えっと', r'あのー+', r'まあ+', r'なんか',
    r'そのー+', r'うーん', r'んー', r'ねー+', r'よー+',
]

# 文末の冗長表現 → 体言止め・短縮に変換するルール（具体的なものから先に適用）
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
    (r'てみました', 'てみた'),
    (r'ていました', 'てた'),
    (r'てきました', 'てきた'),
    (r'ています', 'てる'),
    (r'しました', 'した'),
    (r'します', 'する'),
    (r'ておきます', 'ておく'),
    (r'てください', 'てほしい'),
    (r'ましょう', 'しよう'),
    (r'でしょう', 'だろう'),
    (r'なんです', ''),
    (r'んです', ''),
    (r'ですね', ''),
    (r'ですよ', ''),
    (r'ですが', 'だが'),
    (r'です。', ''),
    (r'です$', ''),
    (r'ます。', ''),
    (r'ます$', ''),
    (r'。$', ''),
]

MAX_CHARS = 20
SOFT_LIMIT = 24  # 圧縮モードで1行が長くなりすぎる目安（超えたら自然な区切りで短縮）

# 文字起こしの誤変換・表記ゆれを統一する辞書（必要に応じて追加してください）
# 例: Whisperが「Seedance」を「Cダンス」と聞き間違える → 正しい表記に直す
TERMS = {
    'シーダンス': 'Seedance',
    'Cダンス': 'Seedance',
    'シーダンス2.0': 'Seedance 2.0',
    'Cダンス2.0': 'Seedance 2.0',
    'ドモAI': 'DomoAI',
    'DomoAi': 'DomoAI',
    'ミュージックビデオ': 'MV',
}


def apply_terms(text: str) -> str:
    # 長いキーから先に置換（部分一致の取りこぼし防止）
    for wrong in sorted(TERMS, key=len, reverse=True):
        text = text.replace(wrong, TERMS[wrong])
    return text


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
    """無料・ローカルで1行に短縮する（文の途中では切らない）"""
    text = remove_fillers(text)

    # 文末を体言止めに変換
    for pattern, replacement in ENDINGS:
        text = re.sub(pattern, replacement, text)

    # 重複表現を除去
    text = re.sub(r'(.{2,})\1', r'\1', text)
    text = re.sub(r'\s+', '', text)
    text = text.strip('、。')

    # 目安の長さに収まっていればそのまま使う
    if len(text) <= SOFT_LIMIT:
        return text

    # 長い場合は句読点で区切り、意味のまとまりを前半から残す
    parts = [p for p in re.split(r'[、。]', text) if p]
    if len(parts) > 1:
        result = ''
        for part in parts:
            candidate = result + part
            if result and len(candidate) > SOFT_LIMIT:
                break
            result = candidate
        if result:
            # 句の区切り（意味のまとまり）で終わっているので中途半端にならない
            return result.strip('、。')

    # 句読点がない長い1文 → 助詞の直後で切り「…」を付けて途中だと明示する
    search_end = min(len(text), SOFT_LIMIT)
    for i in range(search_end, SOFT_LIMIT // 2, -1):
        if text[i - 1] in 'はがをにでもとやへのからまで':
            return text[:i].strip('、。') + '…'
    return text[:SOFT_LIMIT].strip('、。') + '…'


def merge_segments(segments: list[dict], max_gap: float = 0.4, max_duration: float = 2.0, max_chars: int = 60) -> list[dict]:
    """隣接するセグメントを意味のまとまりに結合する。
    ・gap が max_gap 秒以下 → 連続した発話とみなして結合
    ・結合後の尺が max_duration 秒を超える → 打ち切って新セグメント開始
    ・結合後の文字数が max_chars を超える → 打ち切り
    ・句読点（。！？）で終わる → 自然な文末なので打ち切り
    """
    if not segments:
        return []
    merged = []
    buf = dict(segments[0])
    for seg in segments[1:]:
        gap = seg['start'] - buf['end']
        duration = seg['end'] - buf['start']
        combined_len = len(buf['text']) + len(seg['text'])
        ends_sentence = re.search(r'[。！？!?]\s*$', buf['text'].strip())
        if (gap <= max_gap and duration <= max_duration
                and combined_len <= max_chars and not ends_sentence):
            buf['text'] = buf['text'].rstrip() + ' ' + seg['text'].lstrip()
            buf['end'] = seg['end']
        else:
            merged.append(buf)
            buf = dict(seg)
    merged.append(buf)
    return merged


def compress_segments(segments: list[dict]) -> list[dict]:
    result = []
    total = len(segments)
    for i, seg in enumerate(segments, 1):
        print(f"  圧縮中... ({i}/{total})", end='\r')
        compressed = apply_terms(compress_local(seg['text']))
        if compressed:
            result.append({**seg, 'text': compressed})
    print(f"  圧縮完了 ✓ ({total}件)          ")
    return result


def get_gemini_key() -> str:
    config_path = Path.home() / 'Desktop' / '字幕制作ツール' / '.geminikey'
    key = os.environ.get('GEMINI_API_KEY')
    if not key and config_path.exists():
        key = config_path.read_text().strip()
    if not key:
        print("\n  Gemini APIキーを入力してください")
        print("  （https://aistudio.google.com/apikey で無料取得）")
        key = input("  APIキー: ").strip()
        if not key:
            print("  キーが入力されませんでした")
            sys.exit(1)
        config_path.write_text(key)
        print(f"  キーを保存しました（次回から不要）\n")
    return key


def gemini_request(prompt: str, api_key: str) -> str:
    import urllib.request
    import urllib.error
    import time
    url = (
        "https://generativelanguage.googleapis.com/v1beta/"
        f"models/gemini-2.0-flash:generateContent?key={api_key}"
    )
    body = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3, "responseMimeType": "application/json"},
    }).encode('utf-8')

    # 429（レート制限）は待って再試行する（無料枠は混みやすいので長めに待つ）
    for attempt in range(5):
        req = urllib.request.Request(
            url, data=body, headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode('utf-8'))
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 4:
                wait = (attempt + 1) * 30
                print(f"  混雑中... {wait}秒待って再試行 ({attempt + 1}/4)        ", end='\r')
                time.sleep(wait)
                continue
            raise


def summarize_gemini(segments: list[dict]) -> list[dict]:
    """Gemini APIで意味を理解して要約（無料枠）"""
    api_key = get_gemini_key()
    cleaned = [{**s, 'text': remove_fillers(s['text'])} for s in segments]
    cleaned = [s for s in cleaned if s['text']]

    # 1チャンクを小さくして429に当たりにくくする（間隔も十分空ける）
    CHUNK = 15
    result = []
    total = len(cleaned)

    glossary = "\n".join(f"- 「{w}」→「{c}」" for w, c in TERMS.items())

    import time
    for start in range(0, total, CHUNK):
        chunk = cleaned[start:start + CHUNK]
        print(f"  要約中... ({min(start + CHUNK, total)}/{total})        ", end='\r')
        if start > 0:
            time.sleep(12)  # 無料枠のレート制限（1分あたり15リクエスト）に余裕を持って対応

        numbered = "\n".join(f"{i}: {s['text']}" for i, s in enumerate(chunk))
        prompt = (
            "あなたは動画テロップの編集者です。以下は動画の文字起こしを時系列に並べたものです。\n"
            "各行を、視聴者がパッと見て内容をイメージできる読みやすいテロップに書き直してください。\n\n"
            "ルール:\n"
            "- 各行は必ず20文字以内の1行に収める（絶対に超えないこと）\n"
            "- 文末は必ずです・ます調で完結させる（〜です／〜ます／〜でした／〜ました）\n"
            "- 文の途中や助詞（は・が・を・で・に・と）で終わらない\n"
            "- 数字・固有名詞（製品名・価格・秒数など）は省略せず残す\n"
            "- 話し言葉のフィラーや冗長表現は削る\n"
            "- 前後の文脈を踏まえて自然な日本語にする\n"
            "- 入力と同じ行数・同じ順序で出力する\n\n"
            "次の用語は聞き取りミスなので必ず正しい表記に直すこと:\n"
            f"{glossary}\n\n"
            '出力は {"lines": ["要約1", "要約2", ...]} のJSON形式のみ。\n\n'
            f"--- 文字起こし ---\n{numbered}"
        )

        try:
            raw = gemini_request(prompt, api_key)
            lines = json.loads(raw).get("lines", [])
            if len(lines) != len(chunk):
                raise ValueError("行数が一致しません")
            for seg, line in zip(chunk, lines):
                result.append({**seg, 'text': apply_terms(line.strip())})
        except Exception as e:
            # 失敗したチャンクは1件ずつ個別に再送する（小さいほど通りやすい）
            print(f"\n  チャンク失敗({e})、1件ずつ再試行中...")
            for seg in chunk:
                time.sleep(4)
                single_prompt = (
                    "次の動画テロップを20文字以内・です・ます調で完結した1行に書き直してください。\n"
                    "文の途中で終わらないこと。数字・固有名詞は省略せず残すこと。\n"
                    "次の用語は正しい表記に直すこと:\n"
                    f"{glossary}\n\n"
                    '出力は {"lines": ["テロップ"]} のJSON形式のみ。\n\n'
                    f"文字起こし: {seg['text']}"
                )
                try:
                    raw2 = gemini_request(single_prompt, api_key)
                    line = json.loads(raw2).get("lines", [""])[0]
                    result.append({**seg, 'text': apply_terms(line.strip()) or apply_terms(compress_local(seg['text']))})
                except Exception:
                    result.append({**seg, 'text': apply_terms(compress_local(seg['text']))})

    print(f"  要約完了 ✓ ({total}件)              ")
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
        if compressed:
            # 圧縮モードは改行せず1行のまま出力する
            text = seg['text']
            lines = [text] if text else []
        else:
            text = remove_fillers(seg['text'])
            lines = split_into_lines(text) if text else []
        if not lines:
            continue
        start = seconds_to_srt_time(seg['start'])
        end = seconds_to_srt_time(seg['end'])
        entries.append(f"{index}\n{start} --> {end}\n{chr(10).join(lines)}\n")
        index += 1
    return '\n'.join(entries)


def main():
    if len(sys.argv) < 2:
        print("使い方:")
        print("  python telop.py 動画.mp4              # 通常モード（文字起こしそのまま）")
        print("  python telop.py 動画.mp4 --summarize  # AI要約（Gemini無料枠・意味を理解して要約）")
        print("  python telop.py 動画.mp4 --local      # ローカル圧縮（API不要・文末短縮のみ）")
        sys.exit(1)

    video_path = Path(sys.argv[1]).expanduser().resolve()
    use_ai = '--summarize' in sys.argv
    use_local = '--local' in sys.argv
    shorten = use_ai or use_local

    if not video_path.exists():
        print(f"ファイルが見つかりません: {video_path}")
        sys.exit(1)

    if use_ai:
        mode = "AI要約テロップ（Gemini）"
    elif use_local:
        mode = "ローカル圧縮テロップ（無料）"
    else:
        mode = "フルテロップ"
    print(f"\n{video_path.name} → {mode}にします\n")

    audio_path = extract_audio(video_path)
    segments = transcribe(audio_path)
    print(f"  完了 ✓ ({len(segments)}セグメント検出)")

    if shorten:
        before = len(segments)
        segments = merge_segments(segments)
        print(f"  セグメントを結合 ({before} → {len(segments)}件)")

    if use_ai:
        print(f"  Gemini AIで要約中（意味を理解して1行に）...")
        segments = summarize_gemini(segments)
    elif use_local:
        print(f"  ローカルで圧縮中（文末短縮・1行）...")
        segments = compress_segments(segments)

    print(f"  テロップ用に整形中...")
    srt_content = build_srt(segments, compressed=shorten)

    suffix = '_要約' if use_ai else ('_圧縮' if use_local else '')
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
