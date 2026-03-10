<?php

namespace App\Http\Controllers;

use App\Models\RecurringBillTemplate;
use App\Models\Supplier;
use App\Services\RecurringBillService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class RecurringBillController extends Controller
{
    public function __construct(protected RecurringBillService $recurringService) {}

    public function index()
    {
        $templates = RecurringBillTemplate::with(['supplier', 'creator'])
            ->when(request('search'), fn ($q, $s) =>
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('supplier_name', 'like', "%{$s}%"))
            ->when(request('status') === 'active', fn ($q) => $q->where('is_active', true))
            ->when(request('status') === 'inactive', fn ($q) => $q->where('is_active', false))
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('RecurringBills/Index', [
            'templates' => $templates,
            'filters'   => request()->only(['search', 'status']),
        ]);
    }

    public function create()
    {
        return Inertia::render('RecurringBills/Create', [
            'suppliers' => Supplier::where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'               => ['required', 'string', 'max:255'],
            'supplier_id'        => ['nullable', 'integer', 'exists:suppliers,id'],
            'supplier_name'      => ['nullable', 'string', 'max:255'],
            'category'           => ['required', 'in:rent,utilities,internet,supplies,other'],
            'amount'             => ['required', 'numeric', 'min:0.01'],
            'frequency'          => ['required', 'in:monthly,quarterly,annually'],
            'day_of_month'       => ['required', 'integer', 'min:1', 'max:28'],
            'due_day_of_month'   => ['required', 'integer', 'min:1', 'max:28'],
            'start_date'         => ['required', 'date'],
            'end_date'           => ['nullable', 'date', 'after:start_date'],
            'notes'              => ['nullable', 'string', 'max:2000'],
        ]);

        $this->recurringService->createTemplate($validated, Auth::id());

        return redirect()->route('recurring-bills.index')
            ->with('success', 'Recurring bill template created.');
    }

    public function edit(RecurringBillTemplate $recurringBill)
    {
        return Inertia::render('RecurringBills/Edit', [
            'template'  => $recurringBill,
            'suppliers' => Supplier::where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function update(Request $request, RecurringBillTemplate $recurringBill)
    {
        $validated = $request->validate([
            'name'               => ['required', 'string', 'max:255'],
            'supplier_id'        => ['nullable', 'integer', 'exists:suppliers,id'],
            'supplier_name'      => ['nullable', 'string', 'max:255'],
            'category'           => ['required', 'in:rent,utilities,internet,supplies,other'],
            'amount'             => ['required', 'numeric', 'min:0.01'],
            'frequency'          => ['required', 'in:monthly,quarterly,annually'],
            'day_of_month'       => ['required', 'integer', 'min:1', 'max:28'],
            'due_day_of_month'   => ['required', 'integer', 'min:1', 'max:28'],
            'start_date'         => ['nullable', 'date'],
            'end_date'           => ['nullable', 'date'],
            'notes'              => ['nullable', 'string', 'max:2000'],
        ]);

        $this->recurringService->updateTemplate($recurringBill, $validated);

        return redirect()->route('recurring-bills.index')
            ->with('success', 'Recurring bill template updated.');
    }

    public function destroy(RecurringBillTemplate $recurringBill)
    {
        $this->recurringService->deactivateTemplate($recurringBill);

        return redirect()->route('recurring-bills.index')
            ->with('success', 'Recurring bill template deactivated.');
    }
}
