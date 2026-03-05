<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class BackupSqlite extends Command
{
    protected $signature = 'backup:sqlite
                            {--path= : Destination directory for backups (default: storage/backups)}
                            {--keep=30 : Number of daily backups to retain}';

    protected $description = 'Create a dated backup of the SQLite database file.';

    public function handle(): int
    {
        $dbPath = database_path('database.sqlite');

        if (!File::exists($dbPath)) {
            $this->error("SQLite database not found at: {$dbPath}");
            return self::FAILURE;
        }

        $backupDir = $this->option('path') ?: storage_path('backups');
        $keep = (int) $this->option('keep');

        // Ensure backup directory exists
        if (!File::isDirectory($backupDir)) {
            File::makeDirectory($backupDir, 0755, true);
        }

        $date = now()->format('Y-m-d_His');
        $backupFile = $backupDir . DIRECTORY_SEPARATOR . "database_{$date}.sqlite";

        try {
            // Use SQLite's backup API via VACUUM INTO for a consistent snapshot
            // This is safer than file copy as it handles WAL mode properly
            $pdo = new \PDO("sqlite:{$dbPath}");
            $pdo->exec("VACUUM INTO '{$backupFile}'");
            $pdo = null;

            $size = number_format(File::size($backupFile) / 1024, 1);
            $this->info("Backup created: {$backupFile} ({$size} KB)");

            // Prune old backups
            $this->pruneOldBackups($backupDir, $keep);

            return self::SUCCESS;
        } catch (\Exception $e) {
            // Fallback to simple file copy if VACUUM INTO fails
            $this->warn("VACUUM INTO failed ({$e->getMessage()}), falling back to file copy...");

            try {
                File::copy($dbPath, $backupFile);
                $size = number_format(File::size($backupFile) / 1024, 1);
                $this->info("Backup created (file copy): {$backupFile} ({$size} KB)");
                $this->pruneOldBackups($backupDir, $keep);
                return self::SUCCESS;
            } catch (\Exception $e2) {
                $this->error("Backup failed: {$e2->getMessage()}");
                return self::FAILURE;
            }
        }
    }

    protected function pruneOldBackups(string $dir, int $keep): void
    {
        if ($keep <= 0) {
            return;
        }

        $files = collect(File::glob($dir . DIRECTORY_SEPARATOR . 'database_*.sqlite'))
            ->sortDesc()
            ->values();

        if ($files->count() <= $keep) {
            return;
        }

        $toDelete = $files->slice($keep);
        foreach ($toDelete as $file) {
            File::delete($file);
            $this->line("  Pruned old backup: " . basename($file));
        }

        $this->info("Pruned {$toDelete->count()} old backup(s), keeping {$keep} most recent.");
    }
}
