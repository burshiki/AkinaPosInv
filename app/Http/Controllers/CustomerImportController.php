<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;

class CustomerImportController extends Controller
{
    /** GET /customers/import-template */
    public function template()
    {
        $columns = ['name', 'phone', 'email', 'address', 'notes', 'is_active'];
        $sample  = ['Juan dela Cruz', '09171234567', 'juan@example.com', '123 Main St, Brgy. Sample', 'VIP customer', '1'];

        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="customers_import_template.csv"',
            'Cache-Control'       => 'no-cache, no-store, must-revalidate',
            'Pragma'              => 'no-cache',
            'Expires'             => '0',
        ];

        $callback = function () use ($columns, $sample) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $columns);
            fputcsv($handle, $sample);
            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }

    /** POST /customers/import */
    public function import(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,xlsx,xls,txt', 'max:5120'],
        ]);

        try {
            $spreadsheet = IOFactory::load($request->file('file')->getRealPath());
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => 'Could not read file: ' . $e->getMessage()], 422);
        }

        $rows = $spreadsheet->getActiveSheet()->toArray(null, true, true, false);

        if (empty($rows)) {
            return response()->json(['success' => false, 'message' => 'The file is empty.'], 422);
        }

        $headerRow = array_map(fn($h) => strtolower(trim((string) $h)), $rows[0]);

        if (!in_array('name', $headerRow, true)) {
            return response()->json(['success' => false, 'message' => 'Missing required column: name'], 422);
        }

        $col = array_flip($headerRow);

        $imported = 0;
        $updated  = 0;
        $skipped  = 0;
        $errors   = [];

        DB::beginTransaction();
        try {
            foreach (array_slice($rows, 1) as $index => $row) {
                $rowNumber = $index + 2;

                $name = isset($col['name']) ? trim((string) ($row[$col['name']] ?? '')) : '';
                if ($name === '') {
                    $skipped++;
                    continue;
                }

                $getValue = function (string $key) use ($col, $row) {
                    if (!isset($col[$key])) return null;
                    $v = $row[$col[$key]] ?? null;
                    return $v === '' ? null : $v;
                };

                $parseBool = function ($val, bool $default = true): bool {
                    if ($val === null) return $default;
                    return in_array(strtolower(trim((string) $val)), ['1', 'yes', 'true', 'y'], true);
                };

                $data = [
                    'name'      => $name,
                    'phone'     => $getValue('phone'),
                    'email'     => $getValue('email'),
                    'address'   => $getValue('address'),
                    'notes'     => $getValue('notes'),
                    'is_active' => $parseBool($getValue('is_active'), true),
                ];

                try {
                    $existing = Customer::withTrashed()
                        ->where('name', $name)
                        ->first();

                    if ($existing) {
                        $existing->restore();
                        $existing->update($data);
                        $updated++;
                    } else {
                        Customer::create($data);
                        $imported++;
                    }
                } catch (\Illuminate\Database\QueryException $e) {
                    $errors[] = "Row {$rowNumber}: \"{$name}\" — database error, skipped.";
                    $skipped++;
                }
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => 'Import failed: ' . $e->getMessage()], 500);
        }

        return response()->json([
            'success'  => true,
            'imported' => $imported,
            'updated'  => $updated,
            'skipped'  => $skipped,
            'errors'   => $errors,
        ]);
    }
}
