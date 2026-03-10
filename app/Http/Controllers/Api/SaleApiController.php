<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sale;
use Illuminate\Http\JsonResponse;

class SaleApiController extends Controller
{
    public function index(): JsonResponse
    {
        $sales = Sale::with('user')
            ->when(request('status'), fn ($q, $s) => $q->where('status', $s))
            ->when(request('date_from'), fn ($q, $d) => $q->where('sold_at', '>=', $d))
            ->when(request('date_to'), fn ($q, $d) => $q->where('sold_at', '<=', $d . ' 23:59:59'))
            ->orderByDesc('sold_at')
            ->paginate(request('per_page', 20));

        return response()->json($sales);
    }

    public function show(Sale $sale): JsonResponse
    {
        $sale->load(['items', 'user', 'bankAccount']);
        return response()->json($sale);
    }
}
