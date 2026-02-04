# TrainHeroic Traffic Interception Setup

Automated steps to set up frida + mitmproxy for intercepting TrainHeroic API traffic on an Android emulator.

## Prerequisites

- Android Emulator running with the patched TrainHeroic APK
- `frida` and `frida-tools` installed locally (`pip install frida-tools`)
- `mitmproxy` installed locally (`brew install mitmproxy`)
- `adb` available (typically at `~/Library/Android/sdk/platform-tools/adb`)

## Setup Steps

### 1. Ensure adb is on PATH

```bash
export PATH="$PATH:$HOME/Library/Android/sdk/platform-tools"
```

### 2. Verify emulator is connected and app is running

```bash
adb devices
adb shell "ps -A | grep -i trainheroic"
```

### 3. Download and push frida-server

Match the frida-server version to your local frida version and device architecture:

```bash
FRIDA_VERSION=$(frida --version)
ARCH=$(adb shell getprop ro.product.cpu.abi)  # e.g. arm64-v8a

# Map Android ABI to frida naming
case "$ARCH" in
    arm64-v8a) FRIDA_ARCH="arm64" ;;
    armeabi-v7a) FRIDA_ARCH="arm" ;;
    x86_64) FRIDA_ARCH="x86_64" ;;
    x86) FRIDA_ARCH="x86" ;;
esac

curl -L -o /tmp/frida-server.xz \
    "https://github.com/frida/frida/releases/download/${FRIDA_VERSION}/frida-server-${FRIDA_VERSION}-android-${FRIDA_ARCH}.xz"
xz -d /tmp/frida-server.xz
chmod +x /tmp/frida-server

adb push /tmp/frida-server /data/local/tmp/frida-server
adb shell "chmod 755 /data/local/tmp/frida-server"
```

### 4. Start frida-server on device

```bash
adb shell "/data/local/tmp/frida-server &"
```

Verify it's running:

```bash
adb shell "ps -A | grep frida"
```

### 5. Install mitmproxy CA certificate (first time only)

```bash
# Copy mitmproxy CA cert to device as a system-format cert
CERT_HASH=$(openssl x509 -inform PEM -subject_hash_old -in ~/.mitmproxy/mitmproxy-ca-cert.cer | head -1)
cp ~/.mitmproxy/mitmproxy-ca-cert.cer /tmp/${CERT_HASH}.0

adb root
adb remount
adb push /tmp/${CERT_HASH}.0 /system/etc/security/cacerts/
adb shell "chmod 644 /system/etc/security/cacerts/${CERT_HASH}.0"
adb reboot
```

Or for user-space install (no root remount needed):

```bash
adb push ~/.mitmproxy/mitmproxy-ca-cert.cer /sdcard/
# Then on device: Settings > Security > Install from storage
```

### 6. Start mitmdump

`mitmproxy` requires a TTY; use `mitmdump` for headless/automated use, or `mitmweb` for a browser UI:

```bash
# Headless (logs to stdout)
mitmdump --mode regular --listen-port 8080 --set flow_detail=2 &

# Or with web UI at http://127.0.0.1:8081
mitmweb --mode regular --listen-port 8080 &
```

### 7. Configure emulator proxy

```bash
# Get host machine IP visible to emulator
HOST_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')

adb shell settings put global http_proxy "${HOST_IP}:8080"
```

### 8. Create SSL bypass script

Save as `ssl-bypass.js`:

```javascript
Java.perform(function() {
    console.log("[*] SSL Pinning Bypass loaded");

    // Bypass OkHttp CertificatePinner (may be obfuscated by ProGuard)
    try {
        var CertificatePinner = Java.use("okhttp3.CertificatePinner");
        CertificatePinner.check.overload("java.lang.String", "java.util.List")
            .implementation = function(hostname, peerCertificates) {
                console.log("[+] Bypassing CertificatePinner.check() for: " + hostname);
            };
        console.log("[+] OkHttp CertificatePinner bypassed");
    } catch (e) {
        console.log("[-] OkHttp CertificatePinner not found: " + e.message);
    }

    // Bypass SSLContext.init (fundamental - works regardless of HTTP client)
    try {
        var X509TrustManager = Java.use("javax.net.ssl.X509TrustManager");
        var SSLContext = Java.use("javax.net.ssl.SSLContext");

        var TrustAllManager = Java.registerClass({
            name: "com.bypass.TrustAllManager",
            implements: [X509TrustManager],
            methods: {
                checkClientTrusted: function(chain, authType) {},
                checkServerTrusted: function(chain, authType) {},
                getAcceptedIssuers: function() { return []; }
            }
        });

        SSLContext.init.overload(
            "[Ljavax.net.ssl.KeyManager;",
            "[Ljavax.net.ssl.TrustManager;",
            "java.security.SecureRandom"
        ).implementation = function(keyManagers, trustManagers, secureRandom) {
            console.log("[+] Bypassing SSLContext.init()");
            this.init(keyManagers, [TrustAllManager.$new()], secureRandom);
        };
        console.log("[+] SSLContext.init bypassed");
    } catch (e) {
        console.log("[-] SSLContext bypass error: " + e.message);
    }

    console.log("[*] SSL Bypass complete");
});
```

### 9. Attach frida to the running app

```bash
# Find the process name (NOT the package name)
frida-ps -U | grep -i train   # Shows "TrainHeroic"

# Attach with SSL bypass
frida -U -n TrainHeroic -l ssl-bypass.js
```

Expected output:

```
[+] SSLContext.init bypassed
[*] SSL Bypass complete
```

The OkHttp-specific hooks may fail with `ClassNotFoundException` if ProGuard obfuscated the class names. The `SSLContext.init` bypass is sufficient.

## Teardown

```bash
# Remove proxy from emulator
adb shell settings put global http_proxy :0

# Kill frida-server on device
adb shell "pkill frida-server"

# Stop mitmdump
kill $(lsof -ti :8080)
```

## Notes

- The frida process name is `TrainHeroic`, not `com.TrainHeroic.TrainHeroic`
- OkHttp classes are obfuscated by ProGuard in this APK; the `SSLContext.init` hook handles SSL bypass at a lower level
- The mitmproxy CA cert (`c8750f0d.0`) persists across emulator reboots if installed to user certs
- No rate limiting headers observed in the API responses
