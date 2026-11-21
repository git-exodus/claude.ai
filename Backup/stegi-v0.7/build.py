#!/usr/bin/env python3
"""Assembles the game from src/ into its two deliverables.

  stegi.html                           page fragment for the Claude artifact (fonts from Google Fonts)
  android/app/src/main/assets/index.html   standalone page for the APK (fonts embedded, works offline)

Source layout:
  src/page.html   markup of the game screen and all overlays
  src/style.css   every style rule
  src/js/*.js     game code; files are concatenated in name order into ONE function scope,
                  so they share top-level names. The numeric prefixes define the load order.
"""
import base64, glob, os, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
read = lambda *p: open(os.path.join(ROOT, *p), encoding='utf-8').read()

FONT_LINK = ('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
             'family=Lilita+One&family=Nunito:wght@600;800&display=swap">')
FONT_FILES = [('Lilita One', 400, 'lilita-one-latin-400-normal.woff2'),
              ('Nunito', 600, 'nunito-latin-600-normal.woff2'),
              ('Nunito', 800, 'nunito-latin-800-normal.woff2')]
# Same reset the artifact host injects, so the APK page renders identically.
STANDALONE_HEAD = ('<!doctype html><html lang="de"><head><meta charset="utf-8">'
                   '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">'
                   '<style>:root{padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px);'
                   'box-sizing:border-box;height:100%}body{margin:0;font-size:14px}[hidden]{display:none!important}</style>'
                   '</head><body>\n')


def script():
    files = sorted(glob.glob(os.path.join(ROOT, 'src', 'js', '*.js')))
    parts = ['/* ===== %s ===== */\n%s' % (os.path.basename(f), open(f, encoding='utf-8').read().rstrip())
             for f in files]
    return "(() => {\n'use strict';\n\n" + '\n\n'.join(parts) + '\n})();\n'


def embedded_fonts():
    rules = []
    for family, weight, name in FONT_FILES:
        data = base64.b64encode(open(os.path.join(ROOT, 'fonts', name), 'rb').read()).decode()
        rules.append("@font-face{font-family:'%s';font-weight:%d;font-style:normal;"
                     "src:url(data:font/woff2;base64,%s) format('woff2')}" % (family, weight, data))
    return '<style>' + ''.join(rules) + '</style>'


def page(fonts):
    return ('<meta name="claude:viewport-fit-sides" content="cover">\n<title>Stegi</title>\n' + fonts +
            '\n<style>\n' + read('src', 'style.css') + '</style>\n\n' + read('src', 'page.html') +
            '\n<script>\n' + script() + '</script>\n')


def main():
    open(os.path.join(ROOT, 'stegi.html'), 'w', encoding='utf-8').write(page(FONT_LINK))
    asset = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'assets', 'index.html')
    open(asset, 'w', encoding='utf-8').write(STANDALONE_HEAD + page(embedded_fonts()) + '</body></html>\n')
    print('built stegi.html and', os.path.relpath(asset, ROOT))


if __name__ == '__main__':
    sys.exit(main())
