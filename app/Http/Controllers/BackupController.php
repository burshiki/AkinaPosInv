<?php

namespace App\Http\Controllers;

use Symfony\Component\HttpFoundation\StreamedResponse;

class BackupController extends Controller
{
    public function download(): StreamedResponse
    {
        $connection = config('database.default');
        $db = config("database.connections.{$connection}");

        abort_if(
            ($db['driver'] ?? '') !== 'mysql',
            400,
            'Manual backup only supports MySQL.'
        );

        $host     = $db['host'] ?? '127.0.0.1';
        $port     = (string) ($db['port'] ?? '3306');
        $database = $db['database'];
        $username = $db['username'];
        $password = $db['password'] ?? '';

        $filename = 'backup_' . now()->format('Y-m-d_His') . '.sql';

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

        return response()->streamDownload(function () use ($cmd, $cnf) {
            $descriptors = [
                1 => ['pipe', 'w'],
                2 => ['pipe', 'w'],
            ];

            $proc = proc_open($cmd, $descriptors, $pipes);

            if ($proc === false) {
                @unlink($cnf);
                echo "-- ERROR: Could not start mysqldump process.\n";
                return;
            }

            while (!feof($pipes[1])) {
                echo fread($pipes[1], 8192);
                flush();
            }

            fclose($pipes[1]);
            fclose($pipes[2]);
            proc_close($proc);

            @unlink($cnf);
        }, $filename, [
            'Content-Type' => 'application/octet-stream',
        ]);
    }
}
