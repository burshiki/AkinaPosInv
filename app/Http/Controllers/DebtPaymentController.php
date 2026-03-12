<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreDebtPaymentRequest;
use App\Models\BankAccount;
use App\Models\CashDrawerSession;
use App\Models\CustomerDebt;
use App\Services\DebtService;
use Inertia\Inertia;

class DebtPaymentController extends Controller
{
    public function __construct(
        protected DebtService $debtService
    ) {}

    public function create()
    {
        $customerName = request('customer_name', '');
        $outstanding  = 0;
        if ($customerName) {
            $outstanding = CustomerDebt::where('customer_name', $customerName)
                ->whereIn('status', ['unpaid', 'partial'])
                ->sum('balance');
        }

        $cashDrawerOpen = CashDrawerSession::open()->exists();
        $onlineAccounts = BankAccount::where('is_active', true)->get();

        return Inertia::render('Debts/RecordPayment', [
            'customerName'     => $customerName,
            'totalOutstanding' => (float) $outstanding,
            'cashDrawerOpen'   => $cashDrawerOpen,
            'bankAccounts'     => $onlineAccounts,
        ]);
    }

    public function store(StoreDebtPaymentRequest $request)
    {
        $validated = $request->validated();

        if ($validated['payment_method'] === 'cash') {
            if (!CashDrawerSession::open()->exists()) {
                return back()->with('error', 'No open cash drawer session. Please open the drawer before recording a cash payment.');
            }
            $bankAccount       = null;
            $cashDrawerSession = CashDrawerSession::open()->first();
        } else {
            $bankAccount       = BankAccount::findOrFail($validated['bank_account_id']);
            $cashDrawerSession = CashDrawerSession::open()->first(); // link for reporting even if online
        }

        $this->debtService->recordPayment(
            $validated['customer_name'],
            (float) $validated['amount'],
            $bankAccount,
            $validated['payment_method'],
            $request->user()->id,
            $cashDrawerSession?->id
        );

        return redirect()->route('debts.show', $validated['customer_name'])
            ->with('success', 'Payment of ' . number_format($validated['amount'], 2) . ' recorded.');
    }
}
