# Local LAN Deployment Guide — AkinaPOS

This guide explains how to run AkinaPOS on a local network so that **multiple computers** can access the app and share the same database.

---

## The Problem with SQLite

The app currently uses **SQLite** (a single file database). SQLite cannot be accessed by multiple computers at the same time. You must switch to **MySQL or MariaDB** for LAN use.

---

## Architecture Overview

```
[Server PC]
  - Laravel app  (php artisan serve  OR  Apache/Nginx via Laragon/XAMPP)
  - MySQL database (shared across all LAN clients)

[Client PCs]  →  browser  →  http://192.168.x.x:8000
```

Client PCs only need a browser — no extra software required on them.

---

## Step-by-Step Setup

### Step 1 — Install MySQL or MariaDB on the Server PC

Choose one of the following (install on the one PC that will act as the server):

| Option | Download |
|--------|----------|
| **Laragon** (recommended — includes PHP, MySQL, Apache) | https://laragon.org |
| XAMPP (includes PHP, MySQL, Apache) | https://www.apachefriends.org |
| MariaDB standalone | https://mariadb.org |
| MySQL Community Server | https://dev.mysql.com/downloads/mysql/ |

---

### Step 2 — Create the Database and a User

Open MySQL / MariaDB command line (or phpMyAdmin if using XAMPP/Laragon) and run:

```sql
CREATE DATABASE akinapos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'posuser'@'%' IDENTIFIED BY 'yourpassword';
GRANT ALL PRIVILEGES ON akinapos.* TO 'posuser'@'%';
FLUSH PRIVILEGES;
```

> The `'%'` allows connections from any IP on the network.

Replace `yourpassword` with a strong password.

---

### Step 3 — Update the `.env` File on the Server PC

Open `h:\POS\AkinaPOSInv\.env` and change the database section:

```ini
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=akinapos
DB_USERNAME=posuser
DB_PASSWORD=yourpassword
```

---

### Step 4 — Run Migrations

In a terminal inside the project folder:

```bash
php artisan migrate
```

This creates all the tables in MySQL. If you had existing data in SQLite, export it first using [DB Browser for SQLite](https://sqlitebrowser.org/) then import into MySQL.

---

### Step 5 — Allow MySQL to Accept LAN Connections

By default, MySQL only listens on `127.0.0.1` (local only). Fix this:

**For XAMPP** — Edit `C:\xampp\mysql\bin\my.ini`  
**For Laragon** — Edit inside the Laragon MySQL data folder  
**For standalone MySQL/MariaDB** — Edit `my.ini` in the install directory

Find the `[mysqld]` section and change (or add):

```ini
[mysqld]
bind-address = 0.0.0.0
```

Restart MySQL after saving.

---

### Step 6 — Serve the Laravel App on the LAN

Run this in the project terminal:

```bash
php artisan serve --host=0.0.0.0 --port=8000
```

Or, if using Laragon/XAMPP with Apache/Nginx, configure a virtual host pointing to `h:\POS\AkinaPOSInv\public` and it will be available on port 80.

---

### Step 7 — Find the Server PC's Local IP Address

On the server PC, open Command Prompt and run:

```cmd
ipconfig
```

Look for **IPv4 Address** under your network adapter, e.g., `192.168.1.10`.

---

### Step 8 — Access from Other Computers

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
   - Port **8000** (or 80) — for the Laravel app
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
| Find server IP | `ipconfig` in CMD |
| App URL from clients | `http://<server-ip>:8000` |
| DB connection | MySQL on `127.0.0.1:3306` |
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
   - Program/script: `C:\php\php.exe` *(adjust to your PHP path)*
   - Add arguments: `artisan schedule:run`
   - Start in: `C:\inetpub\wwwroot\AkinaPOSInv` *(adjust to your deploy path)*
5. **Conditions tab:** Uncheck **"Start the task only if on AC power"**
6. **Settings tab:** Check **"If the task is already running, do not start a new instance"**

### Option B — PowerShell (run as Administrator)

```powershell
$action = New-ScheduledTaskAction `
    -Execute "C:\php\php.exe" `
    -Argument "artisan schedule:run" `
    -WorkingDirectory "C:\inetpub\wwwroot\AkinaPOSInv"

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

> Replace `C:\php\php.exe` and the working directory with your actual paths.

### Verify it works

```powershell
cd C:\inetpub\wwwroot\AkinaPOSInv
php artisan schedule:run
```

You should see output like:
```
Running [backup:mysql] ............. DONE
```

---

*Last updated: March 11, 2026*
