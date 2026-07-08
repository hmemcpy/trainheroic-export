# Run Same Superset Build On Emulator (No Patching)

If your physical device has the "good" / working Superset build and your emulator is blocked because it has a different build, the most reliable way to make them identical is:

1. Pull the *installed* base APK + split APKs from the phone.
2. Install those exact APKs onto the emulator with `adb install-multiple`.

This keeps you on the official binaries as-installed (no binary modification).

## 1) Get Device Serials

```bash
adb devices
```

You should see something like:

```text
emulator-5554 device
R58N123ABC    device
```

## 2) Verify Version On Phone

```bash
adb -s R58N123ABC shell dumpsys package com.supersetapp.android | rg -n "versionName|versionCode"
```

## 3) Clone Installed Package To Emulator

Use the helper script:

```bash
./scripts/android-clone-package.sh \
  --package com.supersetapp.android \
  --from R58N123ABC \
  --to emulator-5554
```

This will:

- run `pm path` on the source device to find `base.apk` and all `split_*.apk`
- `adb pull` each apk
- `adb install-multiple -r -d` onto the target

Pulled APKs are stored under `./tmp/android-clone/…` for reference.

## 4) Verify Version On Emulator

```bash
adb -s emulator-5554 shell dumpsys package com.supersetapp.android | rg -n "versionName|versionCode"
```

## Notes / Troubleshooting

- If install fails due to signature mismatch, uninstall on the emulator first:

```bash
adb -s emulator-5554 uninstall com.supersetapp.android
```

- If `rg` isn’t installed, replace with `grep -n`.

## Alternative: Install From A Downloaded XAPK (No Phone Needed)

If you can download the official `.xapk` for the exact version you need (for example from your normal distribution channel), you can install it onto the emulator without pulling anything from your phone:

```bash
adb devices
./scripts/android-install-xapk.sh \
  --xapk /path/to/Superset+App_0.1.164_*.xapk \
  --to emulator-5554 \
  --pkg com.supersetapp.android
```
