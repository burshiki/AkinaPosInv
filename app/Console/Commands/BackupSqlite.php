<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class BackupSqlite extends Command
{
    protected $signature = 'backup:mysql
                            {--path= : Destination directory for backups (default: storage/backups)}
                            {--keep=30 : Number of daily backups to retain}';

    protected $description = 'Create a dated mysqldump backup of the MySQL database.';

    public function handle(): int
    {
        $connection = config('database.default');
        $db = config("database.connections.{$connection}");

        if (($db['driver'] ?? '') !== 'mysql') {
            $this->error("Default connection is not MySQL (got: " . ($db['driver'] ?? 'unknown') . ").");
            return self::FAILURE;
        }

        $host     = $db['host'] ?? '127.0.0.1';
        $port     = (string) ($db['port'] ?? '3306');
        $database = $db['database'];
        $username = $db['username'];
        $password = $db['password'] ?? '';

        $backupDir = $this->option('path') ?: storage_path('backups');
        $keep      = (int) $this->option('keep');

        if (!File::isDirectory($backupDir)) {
            File::makeDirectory($backupDir, 0755, true);
        }

        $date       = now()->format('Y-m-d_His');
        $backupFile = $backupDir . DIRECTORY_SEPARATOR . "database_{$date}.sql";

        // Write a temporary MySQL options file to avoid exposing the password in the process list.
        $cnf = tempnam(sys_get_temp_dir(), 'mybackup_');
        file_put_contents($cnf, "[mysqldump]\npassword=" . str_replace('"', '\\"', $password) . "\n");
        chmod($cnf, 0600);

        $cmd = sprintf(
            'mysqldump --defaults-extra-file=%s --host=%s --port=%s --user=%s --single-transaction --routines --triggers %s',
            escapeshellarg($cnf),
            escapeshellarg($host),
            escapeshellarg($port),
            escapeshellarg($username),
            escapeshellarg($database)
        );

        exec($cmd . ' > ' . escapeshellarg($backupFile) . ' 2>&1', $output, $exitCode);

        @unlink($cnf);

        if ($exitCode !== 0) {
            $this->error('mysqldump failed: ' . implode("\n", $output));
            return self::FAILURE;
        }

        $size = number_format(File::size($backupFile) / 1024, 1);
        $this->info("Backup created: {$backupFile} ({$size} KB)");

        $this->pruneOldBackups($backupDir, $keep);

        return self::SUCCESS;
    }

    protected function pruneOldBackups(string $dir, int $keep): void
    {
        if ($keep <= 0) {
            return;
        }

        $files = collect(File::glob($dir . DIRECTORY_SEPARATOR . 'database_*.sql'))
            ->sortDesc()
            ->values();

        if ($files->count() <= $keep) {
            return;
        }

        $toDelete = $files->slice($keep);
        foreach ($toDelete as $file) {
            File::delete($file);
            $this->line('  Pruned old backup: ' . basename($file));
        }

        $this->info("Pruned {$toDelete->count()} old backup(s), keeping {$keep} most recent.");
    }
}
