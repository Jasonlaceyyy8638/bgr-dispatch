# Admin password reset (forgot password)

If you forget your admin password, you can reset it using a **reset code** that you store in your environment.

## 1. Set the reset code (one time)

Choose a long random string (e.g. 20+ characters) and keep it somewhere safe (e.g. password manager). Add it to:

- **Local:** `.env.local`
- **Netlify:** Site configuration → Environment variables

Variable name:

```
ADMIN_PASSWORD_RESET_SECRET
```

Example value: `my-secret-reset-code-xyz-12345` (use something much stronger in production.)

## 2. Reset the password

1. Go to **Admin sign-in** (`/login/admin`).
2. Click **Forgot password? Reset with reset code**.
3. Enter:
   - **Admin email** – the email you use to sign in as admin
   - **New password** – at least 6 characters
   - **Reset code** – the exact value of `ADMIN_PASSWORD_RESET_SECRET`
4. Click **Reset password**.
5. Sign in at `/login/admin` with your email and the new password.

The reset code is only used for this flow; it is not your login password.
