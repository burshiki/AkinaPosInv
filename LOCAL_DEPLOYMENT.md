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

*Last updated: March 10, 2026*
