# ── Capacitor Core ──────────────────────────────────────────────────────────
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.annotation.PluginMethod public *;
}

# ── WebView JavaScript Bridge ────────────────────────────────────────────────
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep the custom WebAppInterface used for APK downloads
-keepclassmembers class com.zefast.app.MainActivity$WebAppInterface {
   public *;
}
-keepattributes JavascriptInterface

# ── Firebase ─────────────────────────────────────────────────────────────────
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# ── Capacitor Google Auth plugin ─────────────────────────────────────────────
# R8 strips this plugin's classes because the plugin's own proguard-rules.pro
# is empty. Without these rules Google Sign-In crashes on the CapacitorPlugins
# thread in release builds.
-keep class com.codetrixstudio.capacitor.GoogleAuth.** { *; }
-keep class com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth { *; }

# Keep Google Sign-In options and account classes used at runtime
-keep class com.google.android.gms.auth.api.signin.** { *; }
-keep class com.google.android.gms.auth.api.signin.GoogleSignInOptions { *; }
-keep class com.google.android.gms.auth.api.signin.GoogleSignInAccount { *; }

# ── Keep line numbers for crash reporting ────────────────────────────────────
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ── Suppress common warnings ─────────────────────────────────────────────────
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
