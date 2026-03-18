<?php

namespace App\Http\Controllers;

use App\Mail\QuotationMail;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Quotation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;

class QuotationController extends Controller
{
    public function index(Request $request)
    {
        $quotations = Quotation::with(['user'])
            ->withCount('items')
            ->when(
                $request->search,
                fn ($q, $s) => $q->where('quotation_number', 'like', "%{$s}%")
                    ->orWhere('customer_name', 'like', "%{$s}%")
                    ->orWhere('customer_email', 'like', "%{$s}%")
            )
            ->when(
                $request->status && $request->status !== 'all',
                fn ($q, $s) => $q->where('status', $s)
            )
            ->latest()
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Quotations/Index', [
            'quotations' => $quotations,
            'filters'    => $request->only(['search', 'status']),
        ]);
    }

    public function create()
    {
        return Inertia::render('Quotations/Create', [
            'products'  => Product::where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'sku', 'selling_price']),
            'customers' => Customer::where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'phone', 'email']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id'          => ['nullable', 'exists:customers,id'],
            'customer_name'        => ['nullable', 'string', 'max:255'],
            'customer_email'       => ['nullable', 'email', 'max:255'],
            'customer_phone'       => ['nullable', 'string', 'max:50'],
            'discount_type'        => ['required', 'in:fixed,percentage'],
            'discount_amount'      => ['required', 'numeric', 'min:0'],
            'notes'                => ['nullable', 'string', 'max:1000'],
            'valid_until'          => ['nullable', 'date'],
            'items'                => ['required', 'array', 'min:1'],
            'items.*.product_id'   => ['nullable', 'exists:products,id'],
            'items.*.product_name' => ['required', 'string', 'max:255'],
            'items.*.product_sku'  => ['nullable', 'string', 'max:100'],
            'items.*.quantity'     => ['required', 'integer', 'min:1'],
            'items.*.unit_price'   => ['required', 'numeric', 'min:0'],
        ]);

        $subtotal = collect($validated['items'])->sum(
            fn ($i) => $i['quantity'] * $i['unit_price']
        );
        $discountValue = $validated['discount_type'] === 'percentage'
            ? $subtotal * ($validated['discount_amount'] / 100)
            : $validated['discount_amount'];
        $total = max(0, $subtotal - $discountValue);

        $number = sprintf(
            'QT-%s-%04d',
            now()->format('Ymd'),
            Quotation::whereDate('created_at', today())->count() + 1
        );

        $quotation = Quotation::create([
            'quotation_number' => $number,
            'customer_id'      => $validated['customer_id'] ?? null,
            'customer_name'    => $validated['customer_name'] ?? null,
            'customer_email'   => $validated['customer_email'] ?? null,
            'customer_phone'   => $validated['customer_phone'] ?? null,
            'subtotal'         => $subtotal,
            'discount_type'    => $validated['discount_type'],
            'discount_amount'  => $validated['discount_amount'],
            'tax_amount'       => 0,
            'total'            => $total,
            'notes'            => $validated['notes'] ?? null,
            'valid_until'      => $validated['valid_until'] ?? null,
            'status'           => 'draft',
            'user_id'          => auth()->id(),
        ]);

        foreach ($validated['items'] as $item) {
            $quotation->items()->create([
                'product_id'   => $item['product_id'] ?? null,
                'product_name' => $item['product_name'],
                'product_sku'  => $item['product_sku'] ?? null,
                'quantity'     => $item['quantity'],
                'unit_price'   => $item['unit_price'],
                'subtotal'     => $item['quantity'] * $item['unit_price'],
            ]);
        }

        return redirect()->route('quotations.show', $quotation->id)
            ->with('success', "Quotation {$number} created.");
    }

    public function show(Quotation $quotation)
    {
        $quotation->load(['items', 'customer', 'user']);

        return Inertia::render('Quotations/Show', [
            'quotation' => $quotation,
            'appName'   => config('app.name'),
        ]);
    }

    public function printView(Quotation $quotation)
    {
        $quotation->load(['items', 'customer', 'user']);

        return Inertia::render('Quotations/Print', [
            'quotation' => $quotation,
            'appName'   => config('app.name'),
        ]);
    }

    public function sendEmail(Request $request, Quotation $quotation)
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        $quotation->load(['items']);

        try {
            Mail::to($validated['email'])
                ->send(new QuotationMail($quotation, config('app.name')));
        } catch (\Throwable $e) {
            return back()->with('error', 'Failed to send email: ' . $e->getMessage());
        }

        $quotation->update([
            'status'         => 'sent',
            'customer_email' => $validated['email'],
        ]);

        return back()->with('success', "Quotation sent to {$validated['email']}.");
    }

    public function updateStatus(Request $request, Quotation $quotation)
    {
        $validated = $request->validate([
            'status' => ['required', 'in:draft,sent,accepted,expired'],
        ]);

        $quotation->update(['status' => $validated['status']]);

        return back()->with('success', 'Quotation status updated.');
    }

    public function proceedToSale(Quotation $quotation): \Illuminate\Http\RedirectResponse
    {
        if ($quotation->status !== 'accepted') {
            $quotation->update(['status' => 'accepted']);
        }

        return redirect()->route('sales.create', ['quotation_id' => $quotation->id]);
    }

    public function destroy(Quotation $quotation)
    {
        $quotation->delete();

        return redirect()->route('quotations.index')
            ->with('success', 'Quotation deleted.');
    }
}
