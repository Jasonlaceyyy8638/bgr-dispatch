# Install BGR Dispatch as an App

Techs and you can use the app like a native app in two ways.

---

## Option 1: Install from the browser (PWA) — ready now

The site is set up as a **Progressive Web App (PWA)**. Users can install it from their phone browser so it opens like an app (no browser bar, home screen icon).

### How techs install it

1. **On the phone**, open your BGR Dispatch URL in the browser (e.g. `https://your-app.netlify.app` or your production URL).
2. **iPhone (Safari):**
   - Tap the **Share** button (square with arrow).
   - Tap **Add to Home Screen**.
   - Name it (e.g. “BGR Dispatch”) and tap **Add**.
3. **Android (Chrome):**
   - Tap the **menu** (⋮) or “Add to Home screen” banner if it appears.
   - Tap **Install app** or **Add to Home screen**.
   - Confirm.

After that, they open **BGR Dispatch** from the home screen like any other app. It runs in standalone mode (full screen, no browser UI).

### What’s in place

- **`/public/manifest.json`** – App name, icon, theme color, standalone display.
- **Layout** – PWA meta tags and manifest link so “Add to Home Screen” / “Install app” works.
- **Icons** – Uses `logo.png`. For best results on all devices, add dedicated PWA icons:
  - `public/icon-192.png` (192×192)
  - `public/icon-512.png` (512×512)  
  Then update `manifest.json` to point to `icon-192.png` and `icon-512.png` instead of `logo.png`.

---

## Option 2: App Store / Play Store (optional later)

If you want a listing in the **Apple App Store** and **Google Play Store** so people search and download “BGR Dispatch”:

1. **Apple App Store**
   - Need an **Apple Developer account** ($99/year).
   - Use **Capacitor** (or similar) to wrap your existing Next.js app in a native iOS shell, then submit the build to App Store Connect.

2. **Google Play Store**
   - One-time **Google Play Developer** fee (e.g. $25).
   - Same app can be wrapped with **Capacitor** for Android and submitted to Play Console.

3. **Capacitor** (by Ionic)
   - You keep one codebase (this Next.js app).
   - Build the app as a static export, then run `npx cap add ios` and `npx cap add android`, build, and open in Xcode/Android Studio to submit to the stores.
   - Docs: https://capacitorjs.com/docs

**Recommendation:** Use **Option 1 (PWA)** first so techs can install from the browser immediately. Add Option 2 only if you need a store listing or push notifications that require a native app.
