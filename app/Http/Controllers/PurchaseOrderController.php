<?php

namespace App\Http\Controllers;

use App\Http\Requests\ReceivePurchaseOrderRequest;
use App\Http\Requests\StorePurchaseOrderRequest;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Services\PurchaseOrderService;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class PurchaseOrderController extends Controller
{
    public function __construct(protected PurchaseOrderService $service) {}

    public function index()
    {
        $orders = PurchaseOrder::with(['creator', 'supplier'])
            ->when(request('search'), fn ($q, $s) =>
                $q->where('po_number', 'like', "%{$s}%")
                  ->orWhere('supplier_name', 'like', "%{$s}%"))
            ->when(request('status'), fn ($q, $s) => $q->where('status', $s))
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('PurchaseOrders/Index', [
            'orders'    => $orders,
            'filters'   => request()->only(['search', 'status']),
            'products'  => Product::where('is_active', true)->where('is_assembled', false)->select('id', 'name', 'sku', 'cost_price')->orderBy('name')->get(),
            'suppliers' => Supplier::where('is_active', true)->orderBy('name')->get(['id', 'name', 'contact_person']),
        ]);
    }

    public function create()
    {
        $products = Product::where('is_active', true)
            ->where('is_assembled', false)
            ->select('id', 'name', 'sku', 'cost_price')
            ->orderBy('name')
            ->get();

        $suppliers = Supplier::where('is_active', true)
            ->select('id', 'name', 'contact_person', 'phone', 'email', 'address')
            ->orderBy('name')
            ->get();

        return Inertia::render('PurchaseOrders/Create', [
            'products'  => $products,
            'suppliers' => $suppliers,
        ]);
    }

    public function store(StorePurchaseOrderRequest $request)
    {
        $po = $this->service->createOrder($request->validated(), (int) Auth::id());

        return redirect()->route('purchase-orders.show', $po)
            ->with('success', 'Purchase order created as draft.');
    }

    public function show(PurchaseOrder $purchaseOrder)
    {
        $purchaseOrder->load(['items.product', 'creator', 'supplier', 'bill']);

        return Inertia::render('PurchaseOrders/Show', [
            'order' => $purchaseOrder,
        ]);
    }

    public function approve(PurchaseOrder $purchaseOrder)
    {
        if ($purchaseOrder->status !== 'draft') {
            return back()->with('error', 'Only draft purchase orders can be approved.');
        }

        $this->service->approve($purchaseOrder, auth()->id());

        return back()->with('success', 'Purchase order approved.');
    }

    public function receiveForm(PurchaseOrder $purchaseOrder)
    {
        if (!$purchaseOrder->isReceivable()) {
            return redirect()->route('purchase-orders.show', $purchaseOrder)
                ->with('error', 'This purchase order cannot be received.');
        }

        $purchaseOrder->load('items.product');

        return Inertia::render('PurchaseOrders/Receive', [
            'order' => $purchaseOrder,
        ]);
    }

    public function receiveItems(ReceivePurchaseOrderRequest $request, PurchaseOrder $purchaseOrder)
    {
        if (!$purchaseOrder->isReceivable()) {
            return back()->with('error', 'This purchase order cannot be received.');
        }

        $this->service->receiveItems(
            $purchaseOrder,
            $request->validated()['items'],
            (float) ($request->input('shipping_fee') ?? 0),
            $request->input('notes'),
            $request->input('bill_due_date')
        );

        return redirect()->route('purchase-orders.show', $purchaseOrder)
            ->with('success', 'Items received and stock updated.');
    }

    public function cancel(PurchaseOrder $purchaseOrder)
    {
        if (!$purchaseOrder->isCancellable()) {
            return back()->with('error', 'This PO cannot be cancelled in its current state.');
        }

        $this->service->cancelOrder($purchaseOrder);

        return redirect()->route('purchase-orders.index')
            ->with('success', 'Purchase order cancelled.');
    }

    public function destroy(PurchaseOrder $purchaseOrder)
    {
        if ($purchaseOrder->status !== 'draft') {
            return back()->with('error', 'Only draft purchase orders can be deleted.');
        }

        $purchaseOrder->delete();

        return redirect()->route('purchase-orders.index')
            ->with('success', 'Purchase order deleted.');
    }
}
