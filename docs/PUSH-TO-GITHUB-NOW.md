# Push your code to GitHub (jasonlaceyyy8638/bgr-dispatch)

You’re on the repo page. Now get the code from your computer **into** this repo.

---

## 1. Open a terminal in your project folder

- On Windows: open **Command Prompt** or **PowerShell**.
- Go to the folder where your BGR Dispatch code lives (where you see `package.json`, `app`, `public`, etc.).

  Example (use your real path):

  ```text
  cd C:\Users\varie\Desktop\bgr-dispatch
  ```

---

## 2. Run these commands one at a time

Copy and run each line, then press Enter. Wait for it to finish before going to the next.

**If this folder has never had git:**

```text
git init
```

```text
git add .
```

```text
git commit -m "first commit"
```

**Then (use this even if you already had git):**

```text
git branch -M main
```

```text
git remote add origin https://github.com/Jasonlaceyyy8638/bgr-dispatch.git
```

If it says **"remote origin already exists"**, run this once, then try the push again:

```text
git remote set-url origin https://github.com/Jasonlaceyyy8638/bgr-dispatch.git
```

**Push to GitHub:**

```text
git push -u origin main
```

---

## 3. If it asks for login

- **Username:** your GitHub username (e.g. `Jasonlaceyyy8638`).
- **Password:** do **not** use your normal GitHub password. Use a **Personal Access Token**:
  1. GitHub → your profile (top right) → **Settings**.
  2. Left sidebar → **Developer settings** → **Personal access tokens** → **Tokens (classic)**.
  3. **Generate new token (classic)**. Name it (e.g. "Netlify deploy"). Check **repo**.
  4. Generate, then **copy the token** and paste it when the command line asks for a password.

---

## 4. If the repo already has a README

If GitHub created the repo with a README and you get an error when you `git push`, run:

```text
git pull origin main --allow-unrelated-histories
```

If it opens an editor for a merge message, save and close it. Then run:

```text
git push -u origin main
```

---

## 5. Check GitHub

Refresh **https://github.com/Jasonlaceyyy8638/bgr-dispatch**. You should see your folders: `app`, `public`, `docs`, `package.json`, etc.

**Next:** Go to **Part 2** in **STEP-BY-STEP-GO-LIVE.md** — create the site on Netlify and connect this repo.
