<?php

namespace App\Http\Controllers;

use App\Services\DebtService;
use App\Services\ReportService;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportController extends Controller
{
    public function __construct(
        protected ReportService $reportService,
        protected DebtService $debtService
    ) {}

    public function salesCsv(): StreamedResponse
    {
        $from = request('start_date');
        $to = request('end_date');
        $report = $this->reportService->salesReport($from, $to);

        return $this->streamCsv("sales-report-{$from}-{$to}.csv", function () use ($report) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Date', 'Transactions', 'Revenue', 'Cost', 'Profit']);
            foreach ($report['daily'] as $row) {
                fputcsv($out, [$row['date'], $row['count'], $row['revenue'], $row['cost'], $row['profit']]);
            }
            fputcsv($out, []);
            fputcsv($out, ['Top Products']);
            fputcsv($out, ['Product', 'Qty Sold', 'Revenue']);
            foreach ($report['top_products'] as $row) {
                fputcsv($out, [$row['name'], $row['quantity_sold'], $row['revenue']]);
            }
            fclose($out);
        });
    }

    public function inventoryCsv(): StreamedResponse
    {
        $report = $this->reportService->inventoryReport();

        return $this->streamCsv('inventory-report.csv', function () use ($report) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['ID', 'Name', 'SKU', 'Category', 'Stock', 'Reorder Level', 'Cost Price', 'Selling Price', 'Stock Value']);
            foreach ($report['items'] as $row) {
                fputcsv($out, [
                    $row['id'], $row['name'], $row['sku'], $row['category'],
                    $row['stock'], $row['reorder_level'], $row['cost_price'],
                    $row['selling_price'], $row['stock_value'],
                ]);
            }
            fclose($out);
        });
    }

    public function financialCsv(): StreamedResponse
    {
        $from = request('start_date');
        $to = request('end_date');
        $report = $this->reportService->financialReport($from, $to);

        return $this->streamCsv("financial-report-{$from}-{$to}.csv", function () use ($report) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Metric', 'Value']);
            fputcsv($out, ['Total Revenue', $report['profit_loss']['total_revenue']]);
            fputcsv($out, ['Total Cost', $report['profit_loss']['total_cost']]);
            fputcsv($out, ['Gross Profit', $report['profit_loss']['gross_profit']]);
            fputcsv($out, ['Margin %', $report['profit_loss']['margin_percentage']]);
            fputcsv($out, []);
            fputcsv($out, ['Account', 'Type', 'Balance', 'Inflows', 'Outflows']);
            foreach ($report['accounts'] as $acct) {
                fputcsv($out, [$acct['name'], $acct['type'], $acct['balance'], $acct['total_inflows'], $acct['total_outflows']]);
            }
            fclose($out);
        });
    }

    public function debtAgingCsv(): StreamedResponse
    {
        $report = $this->debtService->getAgingReport();

        return $this->streamCsv('debt-aging-report.csv', function () use ($report) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Customer', 'Total Debt', 'Paid', 'Balance', 'Debts Count']);
            foreach ($report as $row) {
                fputcsv($out, [
                    $row['customer_name'] ?? '', $row['total_debt'] ?? 0,
                    $row['total_paid'] ?? 0, $row['outstanding_balance'] ?? 0,
                    $row['debt_count'] ?? 0,
                ]);
            }
            fclose($out);
        });
    }

    private function streamCsv(string $filename, callable $callback): StreamedResponse
    {
        return response()->streamDownload($callback, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }
}
