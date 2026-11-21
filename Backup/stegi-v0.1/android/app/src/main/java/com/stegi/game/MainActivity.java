package com.stegi.game;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;

/**
 * The whole app is one WebView showing assets/index.html (built from stegi/src by build.py).
 * Java only provides the "Beenden" bridge and forwards the Back key to the game.
 * The screen may turn off normally (no KEEP_SCREEN_ON): it is a pet, not an action game.
 */
public class MainActivity extends Activity {
    private WebView web;

    /** Lets the game's "Beenden" button close the app (window.Android.exit()). */
    private class Bridge {
        @JavascriptInterface
        public void exit() {
            runOnUiThread(new Runnable() { @Override public void run() { finish(); } });
        }
    }

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setSupportZoom(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        web.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        web.setBackgroundColor(0xFF6DBB4F);
        web.setLongClickable(false);
        web.setHapticFeedbackEnabled(false);
        web.addJavascriptInterface(new Bridge(), "Android");
        setContentView(web);
        web.loadUrl("file:///android_asset/index.html");
    }

    /** Back key: the game decides (close a dialog, leave a mode, back to the menu). Returns "1" if handled. */
    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.__back?(window.__back(),1):0", value -> {
            if (!"1".equals(value)) finish();
        });
    }

    @Override protected void onPause() { super.onPause(); web.onPause(); }
    @Override protected void onResume() { super.onResume(); web.onResume(); }
}
