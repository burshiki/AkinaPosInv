<?php

namespace App\Http\Controllers;

use App\Exceptions\InsufficientBalanceException;
use App\Http\Requests\StoreLedgerEntryRequest;
use App\Http\Requests\TransferRequest;
use App\Models\BankAccount;
use App\Services\BankingService;
use Inertia\Inertia;

class BankAccountLedgerController extends Controller
{
    public function __construct(
        protected BankingService $bankingService
    ) {}

    public function createForm(BankAccount $bankAccount)
    {
        return Inertia::render('BankAccounts/RecordEntry', [
            'bankAccount' => $bankAccount,
        ]);
    }

    public function transferForm()
    {
        return Inertia::render('BankAccounts/Transfer', [
            'bankAccounts' => BankAccount::where('is_active', true)->get(),
        ]);
    }

    public function store(StoreLedgerEntryRequest $request, BankAccount $bankAccount)
    {

        $validated = $request->validated();

        try {
            if ($validated['type'] === 'in') {
                $this->bankingService->recordInflow(
                    $bankAccount,
                    $validated['amount'],
                    $validated['description'],
                    $validated['category'],
                    null, null,
                    $request->user()->id
                );
            } else {
                $this->bankingService->recordOutflow(
                    $bankAccount,
                    $validated['amount'],
                    $validated['description'],
                    $validated['category'],
                    null, null,
                    $request->user()->id
                );
            }

            return back()->with('success', 'Ledger entry recorded.');
        } catch (InsufficientBalanceException $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function transfer(TransferRequest $request)
    {

        $validated = $request->validated();

        try {
            $from = BankAccount::findOrFail($validated['from_account_id']);
            $to = BankAccount::findOrFail($validated['to_account_id']);

            $this->bankingService->transfer($from, $to, $validated['amount'], $request->user()->id);

            return back()->with('success', "Transferred ₱{$validated['amount']} from {$from->name} to {$to->name}.");
        } catch (InsufficientBalanceException $e) {
            return back()->with('error', $e->getMessage());
        }
    }
}
