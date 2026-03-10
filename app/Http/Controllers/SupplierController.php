<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSupplierRequest;
use App\Http\Requests\UpdateSupplierRequest;
use App\Models\Supplier;
use Inertia\Inertia;

class SupplierController extends Controller
{
    public function index()
    {
        $suppliers = Supplier::query()
            ->when(request('search'), fn ($q, $s) =>
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('contact_person', 'like', "%{$s}%")
                  ->orWhere('phone', 'like', "%{$s}%")
                  ->orWhere('email', 'like', "%{$s}%"))
            ->when(request('status') === 'active',   fn ($q) => $q->where('is_active', true))
            ->when(request('status') === 'inactive', fn ($q) => $q->where('is_active', false))
            ->withCount('purchaseOrders')
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Suppliers/Index', [
            'suppliers' => $suppliers,
            'filters'   => request()->only(['search', 'status']),
        ]);
    }

    public function create()
    {
        return Inertia::render('Suppliers/Create');
    }

    public function store(StoreSupplierRequest $request)
    {
        Supplier::create($request->validated());

        return redirect()->route('suppliers.index')
            ->with('success', 'Supplier created successfully.');
    }

    public function show(Supplier $supplier)
    {
        $supplier->loadCount('purchaseOrders');

        $warranties = \App\Models\Warranty::with('product')
            ->where('supplier_id', $supplier->id)
            ->orderByDesc('updated_at')
            ->get();

        $outstandingBills = $supplier->bills()
            ->whereIn('status', ['unpaid', 'partial', 'overdue'])
            ->orderBy('due_date')
            ->get();

        $totalOwed = $outstandingBills->sum('balance');

        return Inertia::render('Suppliers/Show', [
            'supplier'         => $supplier,
            'warranties'       => $warranties,
            'outstandingBills' => $outstandingBills,
            'totalOwed'        => $totalOwed,
        ]);
    }

    public function edit(Supplier $supplier)
    {
        return Inertia::render('Suppliers/Edit', [
            'supplier' => $supplier,
        ]);
    }

    public function update(UpdateSupplierRequest $request, Supplier $supplier)
    {
        $supplier->update($request->validated());

        return redirect()->route('suppliers.index')
            ->with('success', 'Supplier updated successfully.');
    }

    public function destroy(Supplier $supplier)
    {
        $supplier->delete();

        return redirect()->route('suppliers.index')
            ->with('success', 'Supplier deleted.');
    }
}
