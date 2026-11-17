#!/bin/bash
# Builds the game page and Burgwacht.apk. Needs the Android SDK in /opt/android-sdk (or ANDROID_HOME).
set -e
cd "$(dirname "$0")"
export ANDROID_HOME="${ANDROID_HOME:-/opt/android-sdk}"
python3 build.py
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
(cd android && gradle --no-daemon -q assembleDebug)
cp android/app/build/outputs/apk/debug/app-debug.apk Burgwacht.apk
echo "Built $(pwd)/Burgwacht.apk"
