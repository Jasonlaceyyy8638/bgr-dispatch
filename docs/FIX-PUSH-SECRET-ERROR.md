# Fix "push declined" / secret scanning error

GitHub is blocking the push because an **old commit** in your history still looks like it has a secret. The code is fixed; we need to push **only** the current code with **no old history**.

Run these in your project folder, **one at a time**, in order.

---

## 1. Start a new branch with no history (orphan)

```text
git checkout --orphan temp-main
```

---

## 2. Stage everything

```text
git add -A
```

---

## 3. Create one clean commit

```text
git commit -m "Initial commit - BGR Dispatch"
```

---

## 4. Replace main with this branch

```text
git branch -D main
```

```text
git branch -m main
```

---

## 5. Push and overwrite the remote

```text
git push -u origin main --force
```

---

After this, GitHub will only see this one commit (no old history), so the push should go through. If it still fails, use the **unblock** link GitHub showed in the error (one-time allow) so you can push, then we can double-check the repo has no secrets.
