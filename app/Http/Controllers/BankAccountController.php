<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreBankAccountRequest;
use App\Http\Requests\UpdateBankAccountRequest;
use App\Models\BankAccount;
use Inertia\Inertia;

class BankAccountController extends Controller
{
    public function index()
    {
        $accounts = BankAccount::withCount('ledgerEntries')
            ->orderBy('name')
            ->get();

        return Inertia::render('BankAccounts/Index', [
            'bankAccounts' => $accounts,
            'totalBalance' => $accounts->where('is_active', true)->sum('balance'),
        ]);
    }

    public function create()
    {
        return Inertia::render('BankAccounts/Create');
    }

    public function store(StoreBankAccountRequest $request)
    {
        $account = BankAccount::create($request->validated());

        return redirect()->route('bank-accounts.index')
            ->with('success', 'Bank account created.');
    }

    public function show(BankAccount $bankAccount)
    {
        $ledger = $bankAccount->ledgerEntries()
            ->with('performer')
            ->when(request('date_from'), fn ($q, $from) => $q->where('transacted_at', '>=', $from))
            ->when(request('date_to'), fn ($q, $to) => $q->where('transacted_at', '<=', $to . ' 23:59:59'))
            ->when(request('category'), fn ($q, $cat) => $q->where('category', $cat))
            ->orderByDesc('transacted_at')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('BankAccounts/Show', [
            'bankAccount' => $bankAccount,
            'ledgerEntries' => $ledger,
            'filters' => request()->only(['date_from', 'date_to', 'category']),
        ]);
    }

    public function edit(BankAccount $bankAccount)
    {
        return Inertia::render('BankAccounts/Edit', [
            'bankAccount' => $bankAccount,
        ]);
    }

    public function update(UpdateBankAccountRequest $request, BankAccount $bankAccount)
    {
        $bankAccount->update($request->validated());

        return redirect()->route('bank-accounts.index')
            ->with('success', 'Bank account updated.');
    }

    public function destroy(BankAccount $bankAccount)
    {
        if ($bankAccount->ledgerEntries()->exists()) {
            $bankAccount->update(['is_active' => false]);
            return redirect()->route('bank-accounts.index')
                ->with('success', 'Bank account deactivated (has ledger history).');
        }

        $bankAccount->delete();

        return redirect()->route('bank-accounts.index')
            ->with('success', 'Bank account deleted.');
    }
}
