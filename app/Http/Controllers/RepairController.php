<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Product;
use App\Models\RepairJob;
use App\Models\RepairJobComponent;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RepairController extends Controller
{
    public function index()
    {
        $repairs = RepairJob::with(['technician'])
            ->when(request('search'), function ($q, $search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('job_number', 'like', "%{$search}%")
                          ->orWhere('customer_name', 'like', "%{$search}%")
                          ->orWhere('problem_description', 'like', "%{$search}%");
                });
            })
            ->when(request('status'), fn ($q, $s) => $q->where('status', $s))
            ->orderByRaw("CASE status WHEN 'pending' THEN 0 WHEN 'in_progress' THEN 1 WHEN 'done' THEN 2 ELSE 3 END")
            ->orderByDesc('accepted_at')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Repairs/Index', [
            'repairs'   => $repairs,
            'filters'   => request()->only(['search', 'status']),
            'counts'    => [
                'pending'     => RepairJob::where('status', 'pending')->count(),
                'in_progress' => RepairJob::where('status', 'in_progress')->count(),
                'done'        => RepairJob::where('status', 'done')->count(),
            ],
            'customers' => Customer::where('is_active', true)->orderBy('name')->get(['id', 'name', 'phone']),
        ]);
    }

    public function create()
    {
        return Inertia::render('Repairs/Create', [
            'customers' => Customer::where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'phone']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id'         => ['nullable', 'exists:customers,id'],
            'customer_name'       => ['required_without:customer_id', 'nullable', 'string', 'max:255'],
            'customer_phone'      => ['nullable', 'string', 'max:50'],
            'problem_description' => ['required', 'string', 'max:2000'],
        ]);

        if (!empty($validated['customer_id'])) {
            $customer = Customer::findOrFail($validated['customer_id']);
            $validated['customer_name']  = $customer->name;
            $validated['customer_phone'] = $validated['customer_phone'] ?? $customer->phone ?? null;
        }

        $job = RepairJob::create([
            'job_number'          => RepairJob::generateJobNumber(),
            'customer_id'         => $validated['customer_id'] ?? null,
            'customer_name'       => $validated['customer_name'] ?? 'Walk-in',
            'customer_phone'      => $validated['customer_phone'] ?? null,
            'problem_description' => $validated['problem_description'],
            'status'              => 'pending',
            'technician_id'       => auth()->id(),
            'accepted_at'         => now(),
        ]);

        return redirect()->route('repairs.show', $job)
            ->with('success', "Repair job {$job->job_number} accepted. Print the claim stub for the customer.");
    }

    public function show(RepairJob $repair)
    {
        $repair->load(['technician', 'customer', 'components.product', 'sale']);

        return Inertia::render('Repairs/Show', [
            'repair'   => $repair,
            'products' => Product::where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'sku', 'selling_price', 'stock_quantity']),
        ]);
    }

    public function start(RepairJob $repair)
    {
        abort_unless($repair->status === 'pending', 422, 'Only pending jobs can be started.');

        $repair->update([
            'status'     => 'in_progress',
            'started_at' => now(),
        ]);

        return back()->with('success', 'Repair started. Timer is running.');
    }

    public function complete(RepairJob $repair)
    {
        abort_unless($repair->status === 'in_progress', 422, 'Only in-progress jobs can be marked as done.');

        $repair->update([
            'status'       => 'done',
            'completed_at' => now(),
        ]);

        return back()->with('success', 'Repair marked as done. Print the claim stub and hand it to the customer.');
    }

    public function addComponent(Request $request, RepairJob $repair)
    {
        abort_unless(in_array($repair->status, ['pending', 'in_progress', 'done']), 422, 'Cannot modify a claimed job.');

        $validated = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'quantity'   => ['required', 'integer', 'min:1'],
            'unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        $product = Product::findOrFail($validated['product_id']);

        $repair->components()->create([
            'product_id'   => $product->id,
            'product_name' => $product->name,
            'product_sku'  => $product->sku,
            'quantity'     => $validated['quantity'],
            'unit_price'   => $validated['unit_price'],
            'subtotal'     => $validated['quantity'] * $validated['unit_price'],
        ]);

        return back()->with('success', "{$product->name} added as replaced component.");
    }

    public function removeComponent(RepairJob $repair, RepairJobComponent $component)
    {
        abort_unless($component->repair_job_id === $repair->id, 403);
        abort_unless(in_array($repair->status, ['pending', 'in_progress', 'done']), 422, 'Cannot modify a claimed job.');

        $component->delete();

        return back()->with('success', 'Component removed.');
    }

    public function updateFee(Request $request, RepairJob $repair)
    {
        abort_unless(in_array($repair->status, ['pending', 'in_progress', 'done']), 422, 'Cannot modify a claimed job.');

        $validated = $request->validate([
            'repair_fee' => ['nullable', 'numeric', 'min:0'],
        ]);

        $repair->update(['repair_fee' => $validated['repair_fee'] ?? null]);

        return back()->with('success', 'Repair fee updated.');
    }

    public function stub(RepairJob $repair)
    {
        $repair->load(['technician']);

        return Inertia::render('Repairs/Stub', [
            'repair'  => $repair,
            'appName' => config('app.name'),
        ]);
    }
}
