#!/bin/bash
# Builds Burgwacht.apk from burgwacht.html. Needs the Android SDK in /opt/android-sdk (or ANDROID_HOME).
set -e
cd "$(dirname "$0")"
export ANDROID_HOME="${ANDROID_HOME:-/opt/android-sdk}"
python3 - <<'PY'
import base64,re
game=open('burgwacht.html',encoding='utf-8').read()
def face(family,weight,file):
    b=base64.b64encode(open('fonts/'+file,'rb').read()).decode()
    return "@font-face{font-family:'%s';font-weight:%d;font-style:normal;src:url(data:font/woff2;base64,%s) format('woff2')}"%(family,weight,b)
fonts=face('Lilita One',400,'lilita-one-latin-400-normal.woff2')+face('Nunito',600,'nunito-latin-600-normal.woff2')+face('Nunito',800,'nunito-latin-800-normal.woff2')
game,n=re.subn(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com[^>]*>','<style>'+fonts+'</style>',game)
assert n==1,'font link not found'
head='<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no"><style>:root{padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px);box-sizing:border-box;height:100%}body{margin:0;font-size:14px}[hidden]{display:none!important}</style></head><body>\n'
open('android/app/src/main/assets/index.html','w',encoding='utf-8').write(head+game+'</body></html>\n')
PY
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
(cd android && gradle --no-daemon -q assembleDebug)
cp android/app/build/outputs/apk/debug/app-debug.apk Burgwacht.apk
echo "Built $(pwd)/Burgwacht.apk"
