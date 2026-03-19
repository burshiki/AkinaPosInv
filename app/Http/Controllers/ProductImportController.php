<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ProductImportController extends Controller
{
    /** GET /products/import-template — download a CSV template */
    public function template()
    {
        $columns = [
            'name', 'sku', 'barcode', 'description', 'category',
            'cost_price', 'selling_price', 'stock_quantity',
            'low_stock_threshold', 'is_active',
        ];

        $sample = [
            'Sample Product', 'SKU-001', '1234567890123', 'A sample product description',
            'Electronics', '100.00', '199.99', '50', '10', '1',
        ];

        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="products_import_template.csv"',
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

    /** POST /products/import — process uploaded file */
    public function import(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,xlsx,xls,txt', 'max:5120'],
        ]);

        $file = $request->file('file');
        $path = $file->getRealPath();

        try {
            $spreadsheet = IOFactory::load($path);
        } catch (\Throwable $e) {
            return response()->json([
                'success'  => false,
                'message'  => 'Could not read file: ' . $e->getMessage(),
            ], 422);
        }

        $sheet = $spreadsheet->getActiveSheet();
        $rows  = $sheet->toArray(null, true, true, false);

        if (empty($rows)) {
            return response()->json(['success' => false, 'message' => 'The file is empty.'], 422);
        }

        // Normalise header row
        $headerRow = array_map(
            fn($h) => strtolower(trim((string) $h)),
            $rows[0]
        );

        $required = ['name'];
        $missing  = array_diff($required, $headerRow);

        if (!empty($missing)) {
            return response()->json([
                'success' => false,
                'message' => 'Missing required columns: ' . implode(', ', $missing),
            ], 422);
        }

        // Build a map: column_name → column_index
        $col = array_flip($headerRow);

        // Pre-load categories by name (lower-cased) for lookup
        $categoryMap = Category::where('is_active', true)
            ->get(['id', 'name'])
            ->keyBy(fn($c) => strtolower(trim($c->name)));

        $imported = 0;
        $updated  = 0;
        $skipped  = 0;
        $errors   = [];

        DB::beginTransaction();

        try {
            foreach (array_slice($rows, 1) as $index => $row) {
                $rowNumber = $index + 2; // 1-based, offset by header

                $name = isset($col['name']) ? trim((string) ($row[$col['name']] ?? '')) : '';

                if ($name === '') {
                    $skipped++;
                    continue;
                }

                $getValue = function (string $key) use ($col, $row) {
                    if (!isset($col[$key])) {
                        return null;
                    }
                    $v = $row[$col[$key]] ?? null;
                    return $v === '' ? null : $v;
                };

                // Resolve category
                $categoryId = null;
                $categoryName = $getValue('category');
                if ($categoryName !== null) {
                    $key = strtolower(trim($categoryName));
                    if (isset($categoryMap[$key])) {
                        $categoryId = $categoryMap[$key]->id;
                    } else {
                        $errors[] = "Row {$rowNumber}: Category \"{$categoryName}\" not found — row imported without category.";
                    }
                }

                // Parse booleans
                $parseBool = function ($val, bool $default = true): bool {
                    if ($val === null) {
                        return $default;
                    }
                    $lower = strtolower(trim((string) $val));
                    return in_array($lower, ['1', 'yes', 'true', 'y'], true);
                };

                $data = [
                    'name'                => $name,
                    'sku'                 => $getValue('sku'),
                    'barcode'             => $getValue('barcode'),
                    'description'         => $getValue('description'),
                    'category_id'         => $categoryId,
                    'cost_price'          => is_numeric($getValue('cost_price')) ? (float) $getValue('cost_price') : 0,
                    'selling_price'       => is_numeric($getValue('selling_price')) ? (float) $getValue('selling_price') : 0,
                    'stock_quantity'      => is_numeric($getValue('stock_quantity')) ? (int) $getValue('stock_quantity') : 0,
                    'low_stock_threshold' => is_numeric($getValue('low_stock_threshold')) ? (int) $getValue('low_stock_threshold') : 10,
                    'is_active'           => $parseBool($getValue('is_active'), true),
                    'is_assembled'        => false,
                    'is_component'        => false,
                    'has_warranty'        => false,
                ];

                if ($data['selling_price'] <= 0) {
                    $errors[] = "Row {$rowNumber}: \"{$name}\" has no selling price — skipped.";
                    $skipped++;
                    continue;
                }

                $sku = $data['sku'];

                try {
                    if ($sku && Product::withTrashed()->where('sku', $sku)->exists()) {
                        // Update existing product (restore if soft-deleted)
                        $product = Product::withTrashed()->where('sku', $sku)->first();
                        $product->restore();
                        $product->update($data);
                        $updated++;
                    } else {
                        // Check for duplicate SKU in the same import batch
                        Product::create($data);
                        $imported++;
                    }
                } catch (\Illuminate\Database\QueryException $e) {
                    $errors[] = "Row {$rowNumber}: \"{$name}\" — " . $this->friendlyDbError($e);
                    $skipped++;
                }
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Import failed: ' . $e->getMessage(),
            ], 500);
        }

        return response()->json([
            'success'  => true,
            'imported' => $imported,
            'updated'  => $updated,
            'skipped'  => $skipped,
            'errors'   => $errors,
        ]);
    }

    private function friendlyDbError(\Illuminate\Database\QueryException $e): string
    {
        $msg = $e->getMessage();
        if (str_contains($msg, 'Duplicate entry') || str_contains($msg, 'UNIQUE constraint failed')) {
            if (str_contains($msg, 'barcode')) {
                return 'Duplicate barcode — skipped.';
            }
            return 'Duplicate SKU — skipped.';
        }
        return 'Database error — skipped.';
    }
}
