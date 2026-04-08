<?php

namespace App\Http\Controllers;

use App\Exceptions\InsufficientBalanceException;
use App\Http\Requests\StoreLedgerEntryRequest;
use App\Http\Requests\UpdateLedgerEntryRequest;
use App\Http\Requests\TransferRequest;
use App\Models\BankAccount;
use App\Models\BankAccountLedger;
use App\Models\Setting;
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
            'defaultTransferFee' => (float) Setting::get('transfer_fee', '0'),
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
            $fee = (float) $validated['transfer_fee'];

            // Save as new default fee
            Setting::set('transfer_fee', $fee);

            $result = $this->bankingService->transfer($from, $to, $validated['amount'], $request->user()->id, $fee);

            $netAmount = $result['net_amount'];
            $msg = "Transferred ₱{$netAmount} from {$from->name} to {$to->name}.";
            if ($fee > 0) {
                if ($result['fee_inclusive']) {
                    $msg .= " Transfer fee of ₱{$fee} was deducted from the transfer amount (insufficient balance to cover fee separately).";
                } else {
                    $msg .= " Transfer fee of ₱{$fee} was deducted from {$from->name}.";
                }
            }

            return back()->with('success', $msg);
        } catch (InsufficientBalanceException $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function update(UpdateLedgerEntryRequest $request, BankAccount $bankAccount, BankAccountLedger $ledger)
    {
        if ($ledger->bank_account_id !== $bankAccount->id) {
            abort(404);
        }

        if ($ledger->reference_type !== null) {
            abort(403, 'Only manually created ledger entries can be edited.');
        }

        $validated = $request->validated();

        $this->bankingService->updateManualEntry(
            $ledger,
            $validated['type'],
            (float) $validated['amount'],
            $validated['description'],
            $validated['category']
        );

        return back()->with('success', 'Ledger entry updated.');
    }
}
