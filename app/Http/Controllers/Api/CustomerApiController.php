<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;

class CustomerApiController extends Controller
{
    public function index(): JsonResponse
    {
        $customers = Customer::query()
            ->when(request('search'), fn ($q, $s) => $q->where('name', 'like', "%{$s}%")->orWhere('phone', 'like', "%{$s}%"))
            ->when(request('active_only', true), fn ($q) => $q->where('is_active', true))
            ->orderBy('name')
            ->paginate(request('per_page', 50));

        return response()->json($customers);
    }

    public function show(Customer $customer): JsonResponse
    {
        $customer->load(['sales' => fn ($q) => $q->latest('sold_at')->limit(20), 'sales.items']);
        return response()->json($customer);
    }
}
