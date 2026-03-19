# Update Deployment Guide — AkinaPOS

This guide explains how to apply code changes (new features, bug fixes) to the deployed server.

---

## Method 1 — Manual File Copy (Current Setup)

### Step 1 — Make and Test Changes

On your **development machine**, make your changes and test them locally before copying to the server.

---

### Step 2 — Copy Updated Files to the Server

Transfer the updated files to the server via USB drive, network share, or any file transfer method.

> Copy only the files you changed. Avoid overwriting the server's `.env` file — it has the production database credentials.

---

### Step 3 — Run Update Commands

Open a terminal inside the project folder on the server and run the appropriate commands based on what changed:

#### PHP / Logic changes only
```bash
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

#### New database migration added
```bash
php artisan migrate --force
```

#### New package added to composer.json
```bash
composer install --no-dev --optimize-autoloader
```

#### Frontend changes (JS / CSS / React components)
```bash
npm run build
```

#### Not sure what changed — run everything (always safe)
```bash
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
npm run build
```

---

### Step 4 — Restart the App

If `php artisan serve` is running in a terminal, stop it (`Ctrl+C`) and start it again:

```bash
php artisan serve --host=0.0.0.0 --port=8000
```

---

## Method 2 — Using Git (Recommended for Frequent Updates)

Using Git makes updates much faster — no manual file copying needed.

### One-Time Setup on the Server

1. Install Git from https://git-scm.com/download/win
2. Open a terminal in the project folder and run:

```bash
git init
git remote add origin <your-repo-url>
git pull origin main
```

---

### Every Future Update

On your **development machine**, commit and push your changes:

```bash
git add .
git commit -m "describe what changed"
git push origin main
```

On the **server**, pull and apply:

```bash
git checkout -- .
git pull origin main
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
npm run build
```

Then restart `php artisan serve`.

---

## Quick Reference

| What changed | Command(s) to run |
|---|---|
| PHP / controller / model changes | `cache:clear`, `config:clear` |
| New migration | `php artisan migrate --force` |
| New composer package | `composer install --no-dev --optimize-autoloader` |
| Frontend (JS / CSS / React) | `npm run build` |
| `.env` changes | `config:clear` + restart serve |
| Everything / not sure | Run the full block above |

---

## Important Reminders

- **Never overwrite `.env`** on the server — it holds the production DB password and app key
- **Always run `migrate --force`** if there are new or changed migration files
- **Restart `php artisan serve`** after any changes to make sure the latest code is loaded
- Test on your development machine **before** copying to the server

---

*Last updated: March 15, 2026*
