<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCustomerRequest;
use App\Http\Requests\UpdateCustomerRequest;
use App\Models\Customer;
use App\Models\Sale;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CustomerController extends Controller
{
    public function index()
    {
        $customers = Customer::query()
            ->when(request('search'), fn ($q, $s) => $q->where('name', 'like', "%{$s}%")
                ->orWhere('phone', 'like', "%{$s}%")
                ->orWhere('email', 'like', "%{$s}%"))
            ->when(request('status'), function ($q, $status) {
                if ($status === 'active') $q->where('is_active', true);
                if ($status === 'inactive') $q->where('is_active', false);
            })
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Customers/Index', [
            'customers' => $customers,
            'filters'   => request()->only(['search', 'status']),
        ]);
    }

    public function create()
    {
        return Inertia::render('Customers/Create');
    }

    public function store(StoreCustomerRequest $request)
    {
        Customer::create($request->validated());

        return redirect()->route('customers.index')
            ->with('success', 'Customer created successfully.');
    }

    /**
     * Quick-create a customer from the POS — returns JSON so the page doesn't navigate away.
     */
    public function quickStore(Request $request)
    {
        $validated = $request->validate([
            'name'  => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:255', 'unique:customers,email'],
        ]);

        $customer = Customer::create(array_merge($validated, ['is_active' => true]));

        return response()->json([
            'id'    => $customer->id,
            'name'  => $customer->name,
            'phone' => $customer->phone,
            'email' => $customer->email,
        ], 201);
    }

    public function show(Customer $customer)
    {
        $purchaseHistory = Sale::where('customer_id', $customer->id)
            ->with('items')
            ->orderByDesc('sold_at')
            ->paginate(15)
            ->withQueryString();

        $stats = [
            'total_purchases' => Sale::where('customer_id', $customer->id)->where('status', 'completed')->count(),
            'total_spent' => Sale::where('customer_id', $customer->id)->where('status', 'completed')->sum('total'),
            'last_purchase' => Sale::where('customer_id', $customer->id)->where('status', 'completed')->latest('sold_at')->value('sold_at'),
        ];

        return Inertia::render('Customers/Show', [
            'customer' => $customer,
            'purchaseHistory' => $purchaseHistory,
            'stats' => $stats,
        ]);
    }

    public function edit(Customer $customer)
    {
        return Inertia::render('Customers/Edit', [
            'customer' => $customer,
        ]);
    }

    public function update(UpdateCustomerRequest $request, Customer $customer)
    {
        $customer->update($request->validated());

        return redirect()->route('customers.index')
            ->with('success', 'Customer updated successfully.');
    }

    public function destroy(Customer $customer)
    {
        $customer->delete();

        return redirect()->route('customers.index')
            ->with('success', 'Customer deleted.');
    }
}
