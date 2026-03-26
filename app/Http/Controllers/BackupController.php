<?php

namespace App\Http\Controllers;

use PDO;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BackupController extends Controller
{
    public function restore(Request $request): RedirectResponse
    {
        $request->validate([
            'backup_file' => ['required', 'file', 'max:102400'], // 100 MB max
        ]);

        $db = config('database.connections.' . config('database.default'));

        abort_if(($db['driver'] ?? '') !== 'mysql', 400, 'Restore only supports MySQL.');

        $file      = $request->file('backup_file');
        $extension = strtolower($file->getClientOriginalExtension());

        if ($extension !== 'sql') {
            return back()->withErrors(['backup_file' => 'Only .sql backup files are allowed.']);
        }

        $sql = file_get_contents($file->getRealPath());

        if (empty(trim($sql))) {
            return back()->withErrors(['backup_file' => 'The backup file is empty.']);
        }

        $host     = $db['host']     ?? '127.0.0.1';
        $port     = (string) ($db['port'] ?? '3306');
        $dbname   = $db['database'];
        $user     = $db['username'];
        $password = $db['password'] ?? '';

        try {
            $pdo = new PDO(
                "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4",
                $user,
                $password,
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
            );

            $pdo->exec('SET FOREIGN_KEY_CHECKS=0');
            $pdo->beginTransaction();

            $statement = '';
            foreach (explode("\n", $sql) as $line) {
                $trimmed = trim($line);
                if ($trimmed === '' || str_starts_with($trimmed, '--')) {
                    continue;
                }
                $statement .= $line . "\n";
                if (str_ends_with($trimmed, ';')) {
                    $pdo->exec(rtrim($statement));
                    $statement = '';
                }
            }

            $pdo->commit();
            $pdo->exec('SET FOREIGN_KEY_CHECKS=1');

        } catch (\Exception $e) {
            if (isset($pdo) && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            return back()->withErrors(['backup_file' => 'Restore failed: ' . $e->getMessage()]);
        }

        return back()->with('success', 'Database restored successfully. Please log out and log back in.');
    }

    public function download(): StreamedResponse
    {
        $db = config('database.connections.' . config('database.default'));

        abort_if(($db['driver'] ?? '') !== 'mysql', 400, 'Manual backup only supports MySQL.');

        $host     = $db['host']     ?? '127.0.0.1';
        $port     = (string) ($db['port'] ?? '3306');
        $dbname   = $db['database'];
        $user     = $db['username'];
        $password = $db['password'] ?? '';

        $filename = 'backup_' . now()->format('Ymd_His') . '.sql';

        return response()->streamDownload(function () use ($host, $port, $dbname, $user, $password) {
            $pdo = new PDO(
                "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4",
                $user,
                $password,
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
            );

            echo "-- AkinaPOS Database Backup\n";
            echo "-- Generated: " . now()->toDateTimeString() . "\n";
            echo "-- Database: {$dbname}\n\n";
            echo "SET FOREIGN_KEY_CHECKS=0;\n";
            echo "SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';\n";
            echo "SET NAMES utf8mb4;\n\n";

            $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);

            foreach ($tables as $table) {
                $createStmt = $pdo->query("SHOW CREATE TABLE `{$table}`")->fetch(PDO::FETCH_NUM);
                echo "-- Table: {$table}\n";
                echo "DROP TABLE IF EXISTS `{$table}`;\n";
                echo $createStmt[1] . ";\n\n";

                $rows = $pdo->query("SELECT * FROM `{$table}`")->fetchAll(PDO::FETCH_ASSOC);

                if (empty($rows)) {
                    echo "-- (no rows)\n\n";
                    continue;
                }

                $colList = '`' . implode('`,`', array_keys($rows[0])) . '`';
                $chunk   = [];

                foreach ($rows as $row) {
                    $vals    = array_map(fn ($v) => $v === null ? 'NULL' : $pdo->quote($v), array_values($row));
                    $chunk[] = '(' . implode(',', $vals) . ')';

                    if (count($chunk) >= 200) {
                        echo "INSERT INTO `{$table}` ({$colList}) VALUES\n" . implode(",\n", $chunk) . ";\n";
                        $chunk = [];
                    }
                }

                if ($chunk) {
                    echo "INSERT INTO `{$table}` ({$colList}) VALUES\n" . implode(",\n", $chunk) . ";\n";
                }

                echo "\n";
            }

            echo "SET FOREIGN_KEY_CHECKS=1;\n";
        }, $filename, [
            'Content-Type'        => 'application/sql',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }
}

