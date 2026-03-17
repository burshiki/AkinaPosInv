<?php

namespace App\Http\Controllers;

use App\Http\Requests\BatchRecordSerialRequest;
use App\Models\Supplier;
use App\Models\Warranty;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class WarrantyController extends Controller
{
    public function index()
    {
        $statusFilter = request('status');

        $query = Warranty::with(['product', 'sale'])
            ->withCount([
                'claims as open_claims_count' => fn ($q) =>
                    $q->whereIn('status', ['open', 'confirmed', 'in_repair']),
            ]);

        if ($statusFilter === 'defective_sent') {
            // Show replaced warranties whose claim has a defective unit sent to supplier
            $query->whereHas('claims', fn ($q) => $q->where('defective_status', 'sent'));
        } elseif ($statusFilter === 'in_repair') {
            // Show warranties whose claim is currently in_repair
            $query->whereHas('claims', fn ($q) => $q->where('status', 'in_repair'));
        } elseif ($statusFilter === 'expired') {
            $query->where('status', 'active')->where('expires_at', '<', today());
        } elseif ($statusFilter) {
            $query->where('status', $statusFilter);
        } else {
            // Default: active + pending_serial only
            $query->whereIn('status', ['pending_serial', 'active']);
        }

        $warranties = $query
            ->when(request('search'), function ($q, $search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('receipt_number', 'like', "%{$search}%")
                          ->orWhere('customer_name', 'like', "%{$search}%")
                          ->orWhere('serial_number', 'like', "%{$search}%");
                });
            })
            ->orderByRaw("CASE status WHEN 'pending_serial' THEN 0 ELSE 1 END")
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Warranties/Index', [
            'warranties'      => $warranties,
            'pendingCount'    => Warranty::pending()->count(),
            'inRepairCount'   => \App\Models\WarrantyClaim::where('status', 'in_repair')->count(),
            'defectiveSentCount' => \App\Models\WarrantyClaim::where('defective_status', 'sent')->count(),
            'filters'         => request()->only(['search', 'status']),
        ]);
    }

    public function show(Warranty $warranty)
    {
        $warranty->load([
            'product',
            'sale',
            'claims.supplier',
            'claims.defectiveSupplier',
            'parentWarranty.product',
            'childWarranty.product',
            'childWarranty.claims',
        ]);

        $suppliers = Supplier::where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Warranties/Show', [
            'warranty'  => $warranty,
            'suppliers' => $suppliers,
        ]);
    }

    public function batchRecordIndex(Request $request)
    {
        $receiptFilter = $request->input('receipt');

        $warranties = Warranty::with(['product'])
            ->pending()
            ->when($receiptFilter, fn ($q) => $q->where('receipt_number', $receiptFilter))
            ->orderBy('receipt_number')
            ->orderBy('id')
            ->get();

        $receipts = Warranty::pending()
            ->distinct()
            ->orderBy('receipt_number')
            ->pluck('receipt_number');

        return Inertia::render('Warranties/BatchRecord', [
            'warranties'    => $warranties,
            'receipts'      => $receipts,
            'receiptFilter' => $receiptFilter,
        ]);
    }

    public function batchRecordStore(BatchRecordSerialRequest $request)
    {
        $rows = collect($request->validated()['serials']);
        $ids  = $rows->pluck('warranty_id');

        $warranties = Warranty::whereIn('id', $ids)
            ->where('status', 'pending_serial')
            ->get()
            ->keyBy('id');

        $count = 0;
        DB::transaction(function () use ($rows, $warranties, &$count) {
            foreach ($rows as $row) {
                $w = $warranties->get($row['warranty_id']);
                if (!$w) continue; // already activated (race condition guard)

                $w->update([
                    'serial_number' => isset($row['serial_number']) && $row['serial_number'] !== '' ? $row['serial_number'] : null,
                    'notes'         => isset($row['notes']) && $row['notes'] !== '' ? $row['notes'] : null,
                    'activated_at'  => now(),
                    'expires_at'    => now()->addMonths($w->warranty_months)->toDateString(),
                    'status'        => 'active',
                ]);
                $count++;
            }
        });

        return redirect()->route('warranties.batch-record')
            ->with('success', "{$count} warrant" . ($count === 1 ? 'y' : 'ies') . " activated.");
    }

    public function recordSerial(Request $request, Warranty $warranty)
    {
        abort_unless($warranty->status === 'pending_serial', 422, 'Only pending warranties can have their serial recorded.');

        $validated = $request->validate([
            'serial_number' => ['nullable', 'string', 'max:255', 'unique:warranties,serial_number'],
            'notes'         => ['nullable', 'string'],
        ]);

        $expiresAt = now()->addMonths($warranty->warranty_months)->toDateString();

        $warranty->update([
            'serial_number' => $validated['serial_number'] ?? null,
            'notes'         => $validated['notes'] ?? null,
            'activated_at'  => now(),
            'expires_at'    => $expiresAt,
            'status'        => 'active',
        ]);

        return back()->with('success', "Warranty activated for {$warranty->product->name}. Expires {$expiresAt}.");
    }
}
