<?php

namespace App\Http\Controllers;

use App\Services\DebtService;
use App\Services\AccountsPayableService;
use App\Services\ReportService;
use Inertia\Inertia;

class ReportController extends Controller
{
    public function __construct(
        protected ReportService $reportService,
        protected DebtService $debtService,
        protected AccountsPayableService $apService
    ) {}

    public function index()
    {
        return Inertia::render('Reports/Index');
    }

    public function show(string $report)
    {
        return match ($report) {
            'sales'         => $this->salesReport(),
            'inventory'     => $this->inventoryReport(),
            'financial'     => $this->financialReport(),
            'debt-aging'    => $this->debtAgingReport(),
            'bill-aging'    => $this->billAgingReport(),
            'internal-use'  => $this->internalUseReportPage(),
            'z-report'      => $this->zReportPage(),
            'monthly'       => $this->monthlyReportPage(),
            default         => abort(404),
        };
    }

    private function salesReport()
    {
        $from   = request('start_date');
        $to     = request('end_date');
        $report = ($from || $to) ? $this->reportService->salesReport($from, $to) : null;

        return Inertia::render('Reports/Sales', [
            'report'  => $report,
            'filters' => ['start_date' => $from ?? '', 'end_date' => $to ?? ''],
        ]);
    }

    private function inventoryReport()
    {
        return Inertia::render('Reports/Inventory', [
            'report' => $this->reportService->inventoryReport(),
        ]);
    }

    private function financialReport()
    {
        $from   = request('start_date');
        $to     = request('end_date');
        $report = ($from || $to) ? $this->reportService->financialReport($from, $to) : null;

        return Inertia::render('Reports/Financial', [
            'report'  => $report,
            'filters' => ['start_date' => $from ?? '', 'end_date' => $to ?? ''],
        ]);
    }

    private function debtAgingReport()
    {
        return Inertia::render('Reports/DebtAging', [
            'report' => $this->debtService->getAgingReport(),
        ]);
    }

    private function internalUseReportPage()
    {
        $from   = request('start_date');
        $to     = request('end_date');
        $reason = request('reason');
        $report = ($from || $to)
            ? $this->reportService->internalUseReport($from, $to, $reason)
            : null;

        return Inertia::render('Reports/InternalUse', [
            'report'  => $report,
            'filters' => [
                'start_date' => $from ?? '',
                'end_date'   => $to   ?? '',
                'reason'     => $reason ?? '',
            ],
        ]);
    }

    public function printInternalUse()
    {
        $from   = request('start_date') ?: now()->startOfMonth()->toDateString();
        $to     = request('end_date')   ?: now()->toDateString();
        $reason = request('reason');
        $report = $this->reportService->internalUseReport($from, $to, $reason);

        return response()->view('reports.internal-use', ['report' => $report]);
    }

    private function zReportPage()
    {
        $date = request('date') ?: now()->toDateString();
        $sessionId = request('session_id');
        $report = $this->reportService->zReport($date, $sessionId);

        return Inertia::render('Reports/ZReport', [
            'report'  => $report,
            'filters' => ['date' => $date, 'session_id' => $sessionId ?? ''],
        ]);
    }

    private function billAgingReport()
    {
        return Inertia::render('Reports/BillAging', [
            'report' => $this->apService->getAgingReport(),
        ]);
    }

    private function monthlyReportPage()
    {
        $from   = request('start_date');
        $to     = request('end_date');
        $report = ($from && $to) ? $this->reportService->monthlyReport($from, $to) : null;

        return Inertia::render('Reports/Monthly', [
            'report'  => $report,
            'filters' => ['start_date' => $from ?? '', 'end_date' => $to ?? ''],
        ]);
    }
}
