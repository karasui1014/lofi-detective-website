#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
index.html -> A5 PDF (WeasyPrint) + ページ別PNG (PyMuPDF, 検証用)。
使用文字だけにフォントをサブセット化して fonts/*.woff2 を生成する。
  python render.py [html] [pdf]
環境変数 FONT_SRC に元TTF(4種)のディレクトリ（既定 /tmp/fonts_src）。
"""
import os, re, sys, subprocess, pathlib

HERE = pathlib.Path(__file__).resolve().parent
SRC = pathlib.Path(os.environ.get("FONT_SRC", "/tmp/fonts_src"))
FONTS = HERE / "fonts"; FONTS.mkdir(exist_ok=True)
VENV_BIN = pathlib.Path(sys.executable).parent

SUBSETS = {
    "MPLUSRounded1c-Regular.ttf": "MPLUSRounded1c-Regular.woff2",
    "MPLUSRounded1c-Medium.ttf":  "MPLUSRounded1c-Medium.woff2",
    "MPLUSRounded1c-Bold.ttf":    "MPLUSRounded1c-Bold.woff2",
    "MochiyPopOne-Regular.ttf":   "MochiyPopOne-Regular.woff2",
}

def charset(html):
    txt = re.sub(r"<[^>]+>", " ", html)            # strip tags
    base = (" 　、。！？…・「」『』（）()％%／/＋+－-—~〜♪→℃®"
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:;'\"")
    chars = set(txt) | set(base)
    chars -= {"\n", "\t"}
    return "".join(sorted(chars))

def subset(html):
    chars = charset(html)
    (HERE / ".charset.txt").write_text(chars, encoding="utf-8")
    for src, dst in SUBSETS.items():
        sp = SRC / src
        if not sp.exists():
            print("!! missing font source:", sp); continue
        subprocess.run([str(VENV_BIN / "pyftsubset"), str(sp),
                        f"--text-file={HERE/'.charset.txt'}",
                        "--flavor=woff2", "--layout-features=*",
                        f"--output-file={FONTS/dst}"], check=True)
        print("subset ->", dst, (FONTS/dst).stat().st_size, "bytes")

def render(html_path, pdf_path):
    import weasyprint, fitz
    html = pathlib.Path(html_path).read_text(encoding="utf-8")
    subset(html)
    weasyprint.HTML(filename=html_path, base_url=str(HERE)).write_pdf(pdf_path)
    print("pdf ->", pdf_path)
    doc = fitz.open(pdf_path)
    prev = HERE / "_preview"; prev.mkdir(exist_ok=True)
    for i in range(doc.page_count):
        pix = doc[i].get_pixmap(dpi=150)
        pix.save(str(prev / f"p{i+1}.png"))
    print("pages:", doc.page_count, "-> _preview/p*.png")

if __name__ == "__main__":
    html = sys.argv[1] if len(sys.argv) > 1 else str(HERE / "index.html")
    pdf  = sys.argv[2] if len(sys.argv) > 2 else str(HERE / "ehon-A5.pdf")
    render(html, pdf)
