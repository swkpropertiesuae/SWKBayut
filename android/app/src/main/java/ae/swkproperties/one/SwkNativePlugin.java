package ae.swkproperties.one;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import java.util.Locale;
import java.util.concurrent.Executor;
import org.json.JSONObject;

/**
 * window.SwkAndroidBridge - the only native surface the bundled SWK Rent (ae.swk.rent) web UI can reach.
 * It is exposed to the app origin only: MainActivity refuses to navigate the WebView anywhere else.
 * Every method returns a JSON string so the web side never sees a Java exception.
 */
public class SwkNativePlugin {
    private static final int BIOMETRIC_AUTHENTICATORS =
        BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.DEVICE_CREDENTIAL;
    private static final String PREFS_NAME = "swk_rent_native_prefs";
    private static final String KEY_SERVER_URL = "server_url";
    private static final String KEY_ICON_VARIANT = "icon_variant";

    private final MainActivity activity;
    private final WebView webView;

    public SwkNativePlugin(MainActivity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
    }

    private SharedPreferences prefs() {
        return activity.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    /** Server URL the bundled workspace uses until staff change it in Settings. */
    @JavascriptInterface
    public String getDefaultServerUrl() {
        return BuildConfig.SWK_SERVER_URL;
    }

    /** Returns the active server URL configured by the user or falls back to BuildConfig.SWK_SERVER_URL. */
    @JavascriptInterface
    public String getServerUrl() {
        return prefs().getString(KEY_SERVER_URL, BuildConfig.SWK_SERVER_URL);
    }

    /** Persists a custom Fastify API server URL (https:// or local dev http://) for hybrid/live sync. */
    @JavascriptInterface
    public String setServerUrl(String url) {
        try {
            String trimmed = url == null ? "" : url.trim();
            if (trimmed.isEmpty()) {
                prefs().edit().remove(KEY_SERVER_URL).apply();
                return new JSONObject().put("ok", true).put("server_url", BuildConfig.SWK_SERVER_URL).toString();
            }
            if (!SwkDutyLocationService.isAllowedServer(trimmed)) {
                return new JSONObject().put("ok", false).put("reason", "insecure_server").toString();
            }
            prefs().edit().putString(KEY_SERVER_URL, trimmed).apply();
            return new JSONObject().put("ok", true).put("server_url", trimmed).toString();
        } catch (Exception e) {
            return "{\"ok\":false}";
        }
    }

    /** Comprehensive native app & regulatory metadata for the SWK Rent Android Command Center. */
    @JavascriptInterface
    public String getAppInfoJson() {
        try {
            JSONObject ret = new JSONObject();
            ret.put("application_id", BuildConfig.APPLICATION_ID);
            ret.put("version_name", BuildConfig.VERSION_NAME);
            ret.put("version_code", BuildConfig.VERSION_CODE);
            ret.put("rera_orn", "51517");
            ret.put("server_url", getServerUrl());
            ret.put("icon_variant", prefs().getString(KEY_ICON_VARIANT, "emblem"));
            ret.put("biometric_supported", biometricAvailable());
            ret.put("duty_service_running", SwkDutyLocationService.isRunning());
            return ret.toString();
        } catch (Exception e) {
            return "{}";
        }
    }

    // ANDROID_ID is the intended device identity: it is scoped to this app's signing key and is what HR enrols/revokes.
    @SuppressLint("HardwareIds")
    @JavascriptInterface
    public String getDeviceIdentityJson() {
        try {
            String androidId = Settings.Secure.getString(activity.getContentResolver(), Settings.Secure.ANDROID_ID);
            JSONObject ret = new JSONObject();
            ret.put("device_id", "SWK-AND-" + (androidId != null && !androidId.isEmpty() ? androidId.toUpperCase(Locale.ROOT) : "UNKNOWN"));
            ret.put("device_name", Build.MANUFACTURER + " " + Build.MODEL);
            ret.put("model", Build.MODEL);
            ret.put("manufacturer", Build.MANUFACTURER);
            ret.put("platform", "Android");
            ret.put("os_version", "Android " + Build.VERSION.RELEASE + " (API " + Build.VERSION.SDK_INT + ")");
            ret.put("app_version", BuildConfig.VERSION_NAME);
            ret.put("application_id", BuildConfig.APPLICATION_ID);
            ret.put("rera_orn", "51517");
            ret.put("biometric_supported", biometricAvailable());
            return ret.toString();
        } catch (Exception e) {
            return "{}";
        }
    }

    /**
     * params: { sessionId, assignedLocation, serverUrl, sessionToken, deviceId }.
     * Returns { started, reason? }. When location access is missing the system prompt is shown and
     * reason is "location_permission_required": the agent grants it and taps Start again.
     */
    @JavascriptInterface
    public String startDutyLocationService(String paramsJson) {
        try {
            JSONObject p = new JSONObject(paramsJson == null ? "{}" : paramsJson);
            int sessionId = p.optInt("sessionId", -1);
            String serverUrl = p.optString("serverUrl", getServerUrl());
            String token = p.optString("sessionToken", "");
            if (sessionId <= 0) return result(false, "invalid_session");
            if (token.isEmpty()) return result(false, "not_signed_in");
            if (!SwkDutyLocationService.isAllowedServer(serverUrl)) return result(false, "insecure_server");
            if (ContextCompat.checkSelfPermission(activity, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                activity.runOnUiThread(activity::requestDutyPermissions);
                return result(false, "location_permission_required");
            }

            Intent intent = new Intent(activity, SwkDutyLocationService.class)
                .setAction(SwkDutyLocationService.ACTION_START_DUTY)
                .putExtra(SwkDutyLocationService.EXTRA_SESSION_ID, sessionId)
                .putExtra(SwkDutyLocationService.EXTRA_LOCATION, p.optString("assignedLocation", ""))
                .putExtra(SwkDutyLocationService.EXTRA_SERVER_URL, serverUrl)
                .putExtra(SwkDutyLocationService.EXTRA_TOKEN, token)
                .putExtra(SwkDutyLocationService.EXTRA_DEVICE_ID, p.optString("deviceId", ""));
            ContextCompat.startForegroundService(activity, intent);
            return result(true, null);
        } catch (Exception e) {
            return result(false, "start_failed");
        }
    }

    @JavascriptInterface
    public String stopDutyLocationService() {
        try {
            activity.startService(new Intent(activity, SwkDutyLocationService.class).setAction(SwkDutyLocationService.ACTION_STOP_DUTY));
            return result(true, null);
        } catch (Exception e) {
            return result(false, "stop_failed");
        }
    }

    @JavascriptInterface
    public String getTelemetryJson() {
        try {
            JSONObject ret = new JSONObject();
            ret.put("battery_pct", DeviceTelemetry.batteryPercent(activity));
            ret.put("is_charging", DeviceTelemetry.isCharging(activity));
            ret.put("network_type", DeviceTelemetry.networkType(activity));
            ret.put("duty_service_running", SwkDutyLocationService.isRunning());
            return ret.toString();
        } catch (Exception e) {
            return "{}";
        }
    }

    @JavascriptInterface
    public boolean isBiometricAvailable() {
        return biometricAvailable();
    }

    /** Switch between "emblem" (Emblem + SWK) and "wordmark" (SWK Wordmark) home-screen launcher icons. */
    @JavascriptInterface
    public String setLauncherIconVariant(String variant) {
        try {
            boolean useWordmark = "wordmark".equalsIgnoreCase(variant);
            String chosen = useWordmark ? "wordmark" : "emblem";
            PackageManager pm = activity.getPackageManager();
            android.content.ComponentName mainComp = new android.content.ComponentName(activity, MainActivity.class);
            android.content.ComponentName wordmarkComp = new android.content.ComponentName(activity, "ae.swkproperties.one.MainActivityWordmark");
            pm.setComponentEnabledSetting(
                wordmarkComp,
                useWordmark ? PackageManager.COMPONENT_ENABLED_STATE_ENABLED : PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                PackageManager.DONT_KILL_APP
            );
            pm.setComponentEnabledSetting(
                mainComp,
                useWordmark ? PackageManager.COMPONENT_ENABLED_STATE_DISABLED : PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                PackageManager.DONT_KILL_APP
            );
            prefs().edit().putString(KEY_ICON_VARIANT, chosen).apply();
            return new JSONObject().put("ok", true).put("variant", chosen).toString();
        } catch (Exception e) {
            return "{\"ok\":false}";
        }
    }

    /** Result is delivered as a `swk:biometric-result` window event ({ verified, method }). */
    @JavascriptInterface
    public void promptBiometricUnlock(final String reason) {
        activity.runOnUiThread(() -> {
            if (!biometricAvailable()) {
                dispatchBiometric(false, "Unavailable");
                return;
            }
            Executor executor = ContextCompat.getMainExecutor(activity);
            BiometricPrompt prompt = new BiometricPrompt(activity, executor, new BiometricPrompt.AuthenticationCallback() {
                @Override
                public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult r) {
                    dispatchBiometric(true, "Android BiometricPrompt");
                }

                @Override
                public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                    dispatchBiometric(false, "Cancelled");
                }
            });
            BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
                .setTitle(activity.getString(R.string.biometric_title))
                .setSubtitle(reason != null && !reason.isEmpty() ? reason : activity.getString(R.string.biometric_default_reason))
                .setAllowedAuthenticators(BIOMETRIC_AUTHENTICATORS)
                .build();
            prompt.authenticate(info);
        });
    }

    private boolean biometricAvailable() {
        return BiometricManager.from(activity).canAuthenticate(BIOMETRIC_AUTHENTICATORS) == BiometricManager.BIOMETRIC_SUCCESS;
    }

    private void dispatchBiometric(boolean verified, String method) {
        webView.evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('swk:biometric-result',{detail:{verified:" + verified + ",method:'" + method + "'}}));",
            null);
    }

    private static String result(boolean ok, String reason) {
        try {
            JSONObject o = new JSONObject().put("started", ok).put("stopped", ok);
            if (reason != null) o.put("reason", reason);
            return o.toString();
        } catch (Exception e) {
            return ok ? "{\"started\":true}" : "{\"started\":false}";
        }
    }
}
