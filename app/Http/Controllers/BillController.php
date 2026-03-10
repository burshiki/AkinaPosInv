<?php

namespace App\Http\Controllers;

use App\Exceptions\InsufficientBalanceException;
use App\Models\BankAccount;
use App\Models\Bill;
use App\Models\CashDrawerSession;
use App\Models\Supplier;
use App\Services\AccountsPayableService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class BillController extends Controller
{
    public function __construct(protected AccountsPayableService $apService) {}

    public function index()
    {
        $bills = Bill::with(['supplier', 'creator'])
            ->when(request('search'), fn ($q, $s) =>
                $q->where('bill_number', 'like', "%{$s}%")
                  ->orWhere('supplier_name', 'like', "%{$s}%"))
            ->when(request('status'), fn ($q, $s) => $q->where('status', $s))
            ->when(request('category'), fn ($q, $c) => $q->where('category', $c))
            ->when(request('supplier_id'), fn ($q, $s) => $q->where('supplier_id', $s))
            ->when(request('date_from'), fn ($q, $d) => $q->where('bill_date', '>=', $d))
            ->when(request('date_to'), fn ($q, $d) => $q->where('bill_date', '<=', $d))
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString();

        $totalOutstanding = Bill::whereIn('status', ['unpaid', 'partially_paid', 'overdue'])->sum('balance');
        $totalOverdue = Bill::whereIn('status', ['unpaid', 'partially_paid'])
            ->where('due_date', '<', now()->toDateString())
            ->sum('balance');
        $dueThisWeek = Bill::whereIn('status', ['unpaid', 'partially_paid'])
            ->whereBetween('due_date', [now()->toDateString(), now()->addDays(7)->toDateString()])
            ->sum('balance');

        return Inertia::render('Bills/Index', [
            'bills'            => $bills,
            'filters'          => request()->only(['search', 'status', 'category', 'supplier_id', 'date_from', 'date_to']),
            'totalOutstanding' => round((float) $totalOutstanding, 2),
            'totalOverdue'     => round((float) $totalOverdue, 2),
            'dueThisWeek'      => round((float) $dueThisWeek, 2),
            'suppliers'        => Supplier::where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function create()
    {
        return Inertia::render('Bills/Create', [
            'suppliers' => Supplier::where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'supplier_id'   => ['nullable', 'integer', 'exists:suppliers,id'],
            'supplier_name' => ['required', 'string', 'max:255'],
            'category'      => ['required', 'in:purchase_order,rent,utilities,internet,supplies,other'],
            'bill_date'     => ['required', 'date'],
            'due_date'      => ['required', 'date', 'after_or_equal:bill_date'],
            'tax_amount'    => ['nullable', 'numeric', 'min:0'],
            'notes'         => ['nullable', 'string', 'max:2000'],
            'items'         => ['required', 'array', 'min:1'],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.quantity'    => ['required', 'integer', 'min:1'],
            'items.*.unit_price'  => ['required', 'numeric', 'min:0'],
        ]);

        $bill = $this->apService->createManualBill($validated, Auth::id());

        return redirect()->route('bills.show', $bill)
            ->with('success', 'Bill created successfully.');
    }

    public function show(Bill $bill)
    {
        $bill->load(['supplier', 'purchaseOrder', 'items', 'payments.payer', 'payments.bankAccount', 'creator']);

        return Inertia::render('Bills/Show', [
            'bill' => $bill,
        ]);
    }

    public function payForm(Bill $bill)
    {
        if (!$bill->isPayable()) {
            return redirect()->route('bills.show', $bill)
                ->with('error', 'This bill cannot be paid.');
        }

        $bill->load(['supplier', 'items']);
        $openSession = CashDrawerSession::open()->first();

        return Inertia::render('Bills/Pay', [
            'bill'         => $bill,
            'bankAccounts' => BankAccount::where('is_active', true)->orderBy('name')->get(),
            'openSession'  => $openSession,
        ]);
    }

    public function pay(Request $request, Bill $bill)
    {
        if (!$bill->isPayable()) {
            return back()->with('error', 'This bill cannot be paid.');
        }

        $validated = $request->validate([
            'payment_method'  => ['required', 'in:cash,check,bank_transfer,online'],
            'amount'          => ['required', 'numeric', 'min:0.01', 'max:' . $bill->balance],
            'bank_account_id' => ['required_unless:payment_method,cash', 'nullable', 'integer', 'exists:bank_accounts,id'],
            'check_number'    => ['nullable', 'string', 'max:100'],
            'check_date'      => ['required_if:payment_method,check', 'nullable', 'date'],
            'reference_number' => ['nullable', 'string', 'max:100'],
            'notes'           => ['nullable', 'string', 'max:1000'],
        ]);

        // Attach cash drawer session for cash payments
        if ($validated['payment_method'] === 'cash') {
            $openSession = CashDrawerSession::open()->first();
            if (!$openSession) {
                return back()->with('error', 'No open cash drawer session. Please open a cash drawer first.');
            }
            $validated['cash_drawer_session_id'] = $openSession->id;
        }

        try {
            $this->apService->recordPayment($bill, $validated, Auth::id());
        } catch (InsufficientBalanceException $e) {
            return back()->with('error', $e->getMessage());
        }

        return redirect()->route('bills.show', $bill)
            ->with('success', 'Payment recorded successfully.');
    }

    public function void(Bill $bill)
    {
        if ($bill->status === 'voided') {
            return back()->with('error', 'This bill is already voided.');
        }

        if ($bill->paid_amount > 0) {
            return back()->with('error', 'Cannot void a bill that has payments. Void individual payments first.');
        }

        $this->apService->voidBill($bill);

        return redirect()->route('bills.show', $bill)
            ->with('success', 'Bill voided successfully.');
    }
}
