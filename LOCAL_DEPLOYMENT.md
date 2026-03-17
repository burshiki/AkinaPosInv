# Local LAN Deployment Guide — AkinaPOS

This guide explains how to run AkinaPOS on a local network so that **multiple computers** can access the app and share the same database.

---

## The Problem with SQLite

The app currently uses **SQLite** (a single file database). SQLite cannot be accessed by multiple computers at the same time. You must switch to **MySQL** for LAN use.

---

## Architecture Overview

```
[Server PC]
  - XAMPP (PHP + MySQL + Apache)
  - Laravel app served via Apache or php artisan serve
  - MySQL database (shared across all LAN clients)

[Client PCs]  →  browser  →  http://192.168.x.x:8000
```

Client PCs only need a browser — no extra software required on them.

---

## Step-by-Step Setup

### Step 0 — Prepare the New Server (First-Time Only)

> Skip this step if XAMPP, Composer, and Node.js are already installed.

Laravel does **not** need to be installed globally. The app already contains Laravel inside it. What the server **does** need is:

- **XAMPP** (provides PHP 8.2+ and MySQL)
- **Composer** (PHP dependency manager)
- **Node.js + npm** (to build frontend assets — one time only)

---

#### A — Install XAMPP

1. Download XAMPP from https://www.apachefriends.org (choose **PHP 8.2+**)
2. Run the installer — install to the default `C:\xampp`
3. During install, make sure **Apache** and **MySQL** components are checked
4. After install, open **XAMPP Control Panel** and start **Apache** and **MySQL**

> PHP is bundled inside XAMPP at `C:\xampp\php\php.exe`. Add it to your system PATH so you can run `php` from any terminal:
>
> 1. Search "Environment Variables" → Edit **System variables** → `Path`
> 2. Add `C:\xampp\php`
> 3. Open a new CMD and run `php -v` to confirm it works

---

#### B — Install Composer

1. Download from https://getcomposer.org/Composer-Setup.exe
2. Run the installer — when asked for the PHP path, point it to `C:\xampp\php\php.exe`
3. Verify: open CMD and run `composer -V`

---

#### C — Install Node.js + npm

1. Download the LTS version from https://nodejs.org
2. Install with all defaults
3. Verify: open CMD and run `node -v` and `npm -v`

---

#### D — Copy the Project onto the Server

Copy the entire `AkinaPOSInv` folder to the server, e.g. to `C:\xampp\htdocs\AkinaPOSInv` (or any folder you prefer like `C:\POS\AkinaPOSInv`).

Then open a terminal (CMD or PowerShell) **inside the project folder** and run:

```bash
# Install PHP dependencies
composer install --no-dev --optimize-autoloader

# Install and build frontend assets (one time only)
npm install
npm run build

# Generate app key (only if .env does not have APP_KEY set yet)
php artisan key:generate
```

> If you are copying the `.env` file from the original machine, keep the same `APP_KEY` — do **not** regenerate it, as it is used to decrypt stored data.

---

### Step 1 — Create the Database in XAMPP

1. Open **XAMPP Control Panel** and make sure **MySQL** is running
2. Click **Admin** next to MySQL (opens phpMyAdmin in your browser)
3. Go to **SQL** tab and run:

```sql
CREATE DATABASE akinapos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'posuser'@'%' IDENTIFIED BY 'yourpassword';
GRANT ALL PRIVILEGES ON akinapos.* TO 'posuser'@'%';
FLUSH PRIVILEGES;
```

> The `'%'` allows connections from any IP on the LAN.

Replace `yourpassword` with a strong password.

---

### Step 2 — Update the `.env` File on the Server PC

Open the `.env` file in the project folder and set the database section:

```ini
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=akinapos
DB_USERNAME=posuser
DB_PASSWORD=yourpassword
```

---

### Step 3 — Run Migrations

In a terminal inside the project folder:

```bash
php artisan migrate
```

This creates all the tables in MySQL. If you had existing data in SQLite, export it first using [DB Browser for SQLite](https://sqlitebrowser.org/) then import into MySQL.

---

### Step 4 — Allow MySQL to Accept LAN Connections

By default, XAMPP's MySQL only listens on `127.0.0.1`. To allow other PCs on the LAN to connect:

1. Open `C:\xampp\mysql\bin\my.ini`
2. Find the `[mysqld]` section and add or change:

```ini
[mysqld]
bind-address = 0.0.0.0
```

3. Save the file
4. In **XAMPP Control Panel**, click **Stop** then **Start** on MySQL to restart it

---

### Step 5 — Serve the Laravel App on the LAN

Open a terminal inside the project folder and run:

```bash
php artisan serve --host=0.0.0.0 --port=8000
```

Keep this terminal open — it is the running web server.

> **Alternative (Apache via XAMPP):** You can also configure an Apache virtual host in XAMPP pointing to the project's `public` folder and serve on port 80, so clients can access without a port number. This is optional.

---

### Step 6 — Find the Server PC's Local IP Address

On the server PC, open Command Prompt and run:

```cmd
ipconfig
```

Look for **IPv4 Address** under your network adapter, e.g., `192.168.1.10`.

---

### Step 7 — Access from Other Computers

From any PC on the **same Wi-Fi or LAN**, open a browser and go to:

```
http://192.168.1.10:8000
```

(Replace `192.168.1.10` with the actual IP of your server PC.)

---

## Windows Firewall

You may need to allow inbound connections through Windows Defender Firewall:

1. Open **Windows Defender Firewall with Advanced Security**
2. Add an **Inbound Rule** for:
   - Port **8000** — for the Laravel app (`php artisan serve`)
   - Port **3306** — for MySQL (only needed if other PCs connect to DB directly)
3. Set network type to **Private**

---

## Optional — Set a Static IP on the Server PC

To avoid the server's IP changing after a reboot, assign a static IP:

1. Open **Network & Internet Settings → Change adapter options**
2. Right-click your adapter → **Properties → IPv4**
3. Set manually (example):
   - IP: `192.168.1.10`
   - Subnet: `255.255.255.0`
   - Gateway: `192.168.1.1` (your router IP)
   - DNS: `8.8.8.8`

---

## Quick Reference

| What | Command / Value |
|------|----------------|
| Start app on LAN | `php artisan serve --host=0.0.0.0 --port=8000` |
| PHP path (XAMPP) | `C:\xampp\php\php.exe` |
| MySQL config file | `C:\xampp\mysql\bin\my.ini` |
| phpMyAdmin | `http://localhost/phpmyadmin` |
| Find server IP | `ipconfig` in CMD |
| App URL from clients | `http://<server-ip>:8000` |
| DB name | `akinapos` |

---

## Automated Task Scheduler (Windows Server)

Laravel's scheduler handles automatic backups, recurring bill generation, and overdue bill detection. On Windows, use Task Scheduler to run it every minute.

### What gets scheduled automatically

| Time | Command | What it does |
|------|---------|--------------|
| Every minute | `schedule:run` | Dispatches all due scheduled tasks |
| 2:00 AM daily | `backup:mysql` | Backs up MySQL to `storage/backups/`, keeps last 30 |
| 6:00 AM daily | `bills:generate-recurring` | Creates bills from recurring templates |
| 6:15 AM daily | `bills:mark-overdue` | Marks unpaid bills past due date as overdue |

### Option A — Task Scheduler GUI

1. Open **Task Scheduler** → **Create Task** (not Basic Task)
2. **General tab:**
   - Name: `AkinaPOS Laravel Scheduler`
   - Check **"Run whether user is logged on or not"**
   - Check **"Run with highest privileges"**
3. **Triggers tab → New:**
   - Begin the task: **On a schedule** → **Daily**, recur every `1` day
   - Check **"Repeat task every: 1 minute"** for a duration of **Indefinitely**
4. **Actions tab → New:**
   - Action: **Start a program**
   - Program/script: `C:\xampp\php\php.exe`
   - Add arguments: `artisan schedule:run`
   - Start in: `C:\xampp\htdocs\AkinaPOSInv` *(adjust if your project is in a different folder)*
5. **Conditions tab:** Uncheck **"Start the task only if on AC power"**
6. **Settings tab:** Check **"If the task is already running, do not start a new instance"**

### Option B — PowerShell (run as Administrator)

```powershell
$action = New-ScheduledTaskAction `
    -Execute "C:\xampp\php\php.exe" `
    -Argument "artisan schedule:run" `
    -WorkingDirectory "C:\xampp\htdocs\AkinaPOSInv"

$trigger = New-ScheduledTaskTrigger `
    -RepetitionInterval (New-TimeSpan -Minutes 1) `
    -Once `
    -At (Get-Date)

$settings = New-ScheduledTaskSettingsSet `
    -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 0)

Register-ScheduledTask `
    -TaskName "AkinaPOS Laravel Scheduler" `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -RunLevel Highest `
    -Force
```

> Adjust the `WorkingDirectory` path if your project folder is different (e.g., `C:\POS\AkinaPOSInv`).

### Verify it works

```powershell
cd C:\xampp\htdocs\AkinaPOSInv
php artisan schedule:run
```

You should see output like:
```
Running [backup:mysql] ............. DONE
```

---

*Last updated: March 15, 2026*
