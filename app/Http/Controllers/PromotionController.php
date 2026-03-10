<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use App\Models\Promotion;
use App\Models\PromotionItem;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PromotionController extends Controller
{
    public function index()
    {
        $promotions = Promotion::query()
            ->when(request('status'), function ($q, $status) {
                if ($status === 'active') $q->active();
                if ($status === 'inactive') $q->where('is_active', false);
            })
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Promotions/Index', [
            'promotions' => $promotions,
            'filters' => request()->only(['status']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'type' => ['required', 'in:percentage,fixed_amount,buy_x_get_y'],
            'value' => ['required', 'numeric', 'min:0'],
            'buy_quantity' => ['nullable', 'integer', 'min:1'],
            'get_quantity' => ['nullable', 'integer', 'min:1'],
            'min_purchase' => ['nullable', 'numeric', 'min:0'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'applies_to' => ['required', 'in:all,product,category'],
            'customer_tier' => ['nullable', 'in:standard,silver,gold'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'item_ids' => ['nullable', 'array'],
            'item_ids.*' => ['integer'],
        ]);

        $promo = Promotion::create(collect($validated)->except('item_ids')->toArray());

        // Attach products or categories
        if (!empty($validated['item_ids']) && $validated['applies_to'] !== 'all') {
            foreach ($validated['item_ids'] as $itemId) {
                PromotionItem::create([
                    'promotion_id' => $promo->id,
                    'item_type' => $validated['applies_to'],
                    'item_id' => $itemId,
                ]);
            }
        }

        return back()->with('success', 'Promotion created.');
    }

    public function update(Request $request, Promotion $promotion)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'is_active' => ['boolean'],
            'ends_at' => ['nullable', 'date'],
        ]);

        $promotion->update($validated);

        return back()->with('success', 'Promotion updated.');
    }

    public function destroy(Promotion $promotion)
    {
        $promotion->delete();
        return back()->with('success', 'Promotion deleted.');
    }
}
