<?php

namespace App\Http\Controllers;

use App\Exceptions\InsufficientBalanceException;
use App\Models\BankAccount;
use App\Models\CashDrawerExpense;
use App\Models\CashDrawerReceipt;
use App\Models\CashDrawerSession;
use App\Models\CashDrawerTransfer;
use App\Models\DebtPayment;
use App\Models\Sale;
use App\Services\BankingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class CashDrawerController extends Controller
{
    /**
     * Show list of all cash drawer sessions (history).
     */
    public function index()
    {
        $sessions = CashDrawerSession::with('user')
            ->when(request('search'), function ($query, $search) {
                $query->whereHas('user', fn ($q) => $q->where('name', 'like', "%{$search}%"));
            })
            ->when(request('status'), fn ($query, $status) => $query->where('status', $status))
            ->when(request('date_from'), fn ($query, $from) => $query->where('opened_at', '>=', $from))
            ->when(request('date_to'), fn ($query, $to) => $query->where('opened_at', '<=', $to . ' 23:59:59'))
            ->orderByDesc('opened_at')
            ->paginate(20)
            ->withQueryString();

        $openSession = CashDrawerSession::with('user')->open()->first();

        $summary = null;
        if ($openSession) {
            $cashSalesTotal = Sale::where('cash_drawer_session_id', $openSession->id)
                ->where('status', 'completed')
                ->where('payment_method', 'cash')
                ->sum('total');

            $totalTransactions = Sale::where('cash_drawer_session_id', $openSession->id)
                ->where('status', 'completed')
                ->count();

            $totalChangeGiven = Sale::where('cash_drawer_session_id', $openSession->id)
                ->where('status', 'completed')
                ->where('payment_method', 'cash')
                ->sum('change_amount');

            $transfersToBank = CashDrawerTransfer::where('cash_drawer_session_id', $openSession->id)
                ->where('direction', 'drawer_to_bank')
                ->sum('amount');

            $transfersFromBank = CashDrawerTransfer::where('cash_drawer_session_id', $openSession->id)
                ->where('direction', 'bank_to_drawer')
                ->sum('amount');

            $pettyExpenses = CashDrawerExpense::where('cash_drawer_session_id', $openSession->id)
                ->sum('amount');

            $cashReceiptsTotal = CashDrawerReceipt::where('cash_drawer_session_id', $openSession->id)
                ->sum('amount');

            $cashDebtPayments = DebtPayment::where('cash_drawer_session_id', $openSession->id)
                ->where('payment_method', 'cash')
                ->sum('amount');

            $onlineDebtPayments = DebtPayment::where('cash_drawer_session_id', $openSession->id)
                ->where('payment_method', 'online')
                ->sum('amount');

            $expectedCash = (float) $openSession->opening_balance
                + (float) $cashSalesTotal
                + (float) $cashDebtPayments
                + (float) $cashReceiptsTotal
                - (float) $totalChangeGiven
                + (float) $transfersFromBank
                - (float) $transfersToBank
                - (float) $pettyExpenses;

            $summary = [
                'cash_sales_total'           => round($cashSalesTotal, 2),
                'total_transactions'         => $totalTransactions,
                'total_change_given'         => round($totalChangeGiven, 2),
                'transfers_to_bank'          => round((float) $transfersToBank, 2),
                'transfers_from_bank'        => round((float) $transfersFromBank, 2),
                'petty_cash_expenses'        => round((float) $pettyExpenses, 2),
                'cash_receipts_total'        => round((float) $cashReceiptsTotal, 2),
                'cash_debt_payments_total'   => round((float) $cashDebtPayments, 2),
                'online_debt_payments_total' => round((float) $onlineDebtPayments, 2),
                'expected_cash'              => round($expectedCash, 2),
            ];
        }

        return Inertia::render('CashDrawer/Index', [
            'sessions'     => $sessions,
            'filters'      => request()->only(['search', 'status', 'date_from', 'date_to']),
            'openSession'  => $openSession,
            'summary'      => $summary,
            'bankAccounts' => BankAccount::where('is_active', true)->orderBy('name')->get(),
        ]);
    }

    /**
     * Show the form to open a new cash drawer session.
     */
    public function create()
    {
        // Global check: only 1 open session allowed system-wide
        $openSession = CashDrawerSession::with('user')->open()->first();

        return Inertia::render('CashDrawer/Open', [
            'openSession' => $openSession,
        ]);
    }

    /**
     * Store a new cash drawer session (open the drawer).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'opening_balance' => ['required', 'numeric', 'min:0'],
            'opening_notes'   => ['nullable', 'string', 'max:1000'],
        ]);

        // Prevent duplicate open sessions — only 1 allowed system-wide
        $existing = CashDrawerSession::open()->first();
        if ($existing) {
            return back()->with('error', 'A cash drawer session is already open. Only one session is allowed at a time.');
        }

        CashDrawerSession::create([
            'user_id'         => auth()->id(),
            'opening_balance' => $validated['opening_balance'],
            'opening_notes'   => $validated['opening_notes'] ?? null,
            'status'          => 'open',
            'opened_at'       => now(),
        ]);

        return redirect()->route('sales.create')
            ->with('success', 'Cash drawer opened successfully.');
    }

    /**
     * Show the close drawer form with session summary.
     */
    public function showClose()
    {
        $session = CashDrawerSession::forUser(auth()->id())->open()->first();

        if (!$session) {
            return redirect()->route('cash-drawer.create')
                ->with('error', 'No open cash drawer session found.');
        }

        // Calculate expected cash: opening + cash sales
        $cashSalesTotal = Sale::where('cash_drawer_session_id', $session->id)
            ->where('status', 'completed')
            ->where('payment_method', 'cash')
            ->sum('total');

        $totalTransactions = Sale::where('cash_drawer_session_id', $session->id)
            ->where('status', 'completed')
            ->count();

        $totalChangeGiven = Sale::where('cash_drawer_session_id', $session->id)
            ->where('status', 'completed')
            ->where('payment_method', 'cash')
            ->sum('change_amount');

        $transfersToBank = CashDrawerTransfer::where('cash_drawer_session_id', $session->id)
            ->where('direction', 'drawer_to_bank')
            ->sum('amount');

        $transfersFromBank = CashDrawerTransfer::where('cash_drawer_session_id', $session->id)
            ->where('direction', 'bank_to_drawer')
            ->sum('amount');

        $pettyExpenses = CashDrawerExpense::where('cash_drawer_session_id', $session->id)
            ->sum('amount');

        $cashReceiptsTotal = CashDrawerReceipt::where('cash_drawer_session_id', $session->id)
            ->sum('amount');

        $cashDebtPayments = DebtPayment::where('cash_drawer_session_id', $session->id)
            ->where('payment_method', 'cash')
            ->sum('amount');

        $onlineDebtPayments = DebtPayment::where('cash_drawer_session_id', $session->id)
            ->where('payment_method', 'online')
            ->sum('amount');

        $expectedCash = (float) $session->opening_balance
            + (float) $cashSalesTotal
            + (float) $cashDebtPayments
            + (float) $cashReceiptsTotal
            - (float) $totalChangeGiven
            + (float) $transfersFromBank
            - (float) $transfersToBank
            - (float) $pettyExpenses;

        return Inertia::render('CashDrawer/Close', [
            'session' => $session->load('user'),
            'summary' => [
                'cash_sales_total'           => round($cashSalesTotal, 2),
                'total_transactions'         => $totalTransactions,
                'total_change_given'         => round($totalChangeGiven, 2),
                'transfers_to_bank'          => round((float) $transfersToBank, 2),
                'transfers_from_bank'        => round((float) $transfersFromBank, 2),
                'petty_cash_expenses'        => round((float) $pettyExpenses, 2),
                'cash_receipts_total'        => round((float) $cashReceiptsTotal, 2),
                'cash_debt_payments_total'   => round((float) $cashDebtPayments, 2),
                'online_debt_payments_total' => round((float) $onlineDebtPayments, 2),
                'expected_cash'              => round($expectedCash, 2),
            ],
        ]);
    }

    /**
     * Close the cash drawer session.
     */
    public function close(Request $request)
    {
        $validated = $request->validate([
            'closing_balance' => ['required', 'numeric', 'min:0'],
            'closing_notes'   => ['nullable', 'string', 'max:1000'],
        ]);

        $session = CashDrawerSession::forUser(auth()->id())->open()->first();

        if (!$session) {
            return redirect()->route('cash-drawer.create')
                ->with('error', 'No open cash drawer session found.');
        }

        // Calculate session totals
        $cashSalesTotal = Sale::where('cash_drawer_session_id', $session->id)
            ->where('status', 'completed')
            ->where('payment_method', 'cash')
            ->sum('total');

        $totalTransactions = Sale::where('cash_drawer_session_id', $session->id)
            ->where('status', 'completed')
            ->count();

        $totalChangeGiven = Sale::where('cash_drawer_session_id', $session->id)
            ->where('status', 'completed')
            ->where('payment_method', 'cash')
            ->sum('change_amount');

        $transfersToBank = CashDrawerTransfer::where('cash_drawer_session_id', $session->id)
            ->where('direction', 'drawer_to_bank')
            ->sum('amount');

        $transfersFromBank = CashDrawerTransfer::where('cash_drawer_session_id', $session->id)
            ->where('direction', 'bank_to_drawer')
            ->sum('amount');

        $pettyExpenses = CashDrawerExpense::where('cash_drawer_session_id', $session->id)
            ->sum('amount');

        $cashReceiptsTotal = CashDrawerReceipt::where('cash_drawer_session_id', $session->id)
            ->sum('amount');

        $cashDebtPayments = DebtPayment::where('cash_drawer_session_id', $session->id)
            ->where('payment_method', 'cash')
            ->sum('amount');

        $onlineDebtPayments = DebtPayment::where('cash_drawer_session_id', $session->id)
            ->where('payment_method', 'online')
            ->sum('amount');

        $expectedCash = (float) $session->opening_balance
            + (float) $cashSalesTotal
            + (float) $cashDebtPayments
            + (float) $cashReceiptsTotal
            - (float) $totalChangeGiven
            + (float) $transfersFromBank
            - (float) $transfersToBank
            - (float) $pettyExpenses;

        $closingBalance = (float) $validated['closing_balance'];
        $difference = $closingBalance - $expectedCash;

        $session->update([
            'closing_balance'    => $closingBalance,
            'expected_cash'      => round($expectedCash, 2),
            'cash_sales_total'   => round($cashSalesTotal, 2),
            'difference'         => round($difference, 2),
            'total_transactions' => $totalTransactions,
            'closing_notes'      => $validated['closing_notes'] ?? null,
            'status'             => 'closed',
            'closed_at'          => now(),
        ]);

        return redirect()->route('cash-drawer.show', $session)
            ->with('success', 'Cash drawer closed successfully.');
    }

    /**
     * Transfer funds between the open cash drawer and a bank account.
     */
    public function transfer(Request $request, BankingService $banking)
    {
        $validated = $request->validate([
            'bank_account_id' => ['required', 'integer', 'exists:bank_accounts,id'],
            'direction'       => ['required', 'in:drawer_to_bank,bank_to_drawer'],
            'amount'          => ['required', 'numeric', 'min:0.01'],
            'notes'           => ['nullable', 'string', 'max:500'],
        ]);

        $session = CashDrawerSession::open()->first();

        if (!$session) {
            return back()->with('error', 'No open cash drawer session found.');
        }

        $bankAccount = BankAccount::findOrFail($validated['bank_account_id']);
        $amount      = (float) $validated['amount'];
        $userId      = auth()->id();

        try {
            DB::transaction(function () use ($session, $bankAccount, $amount, $validated, $userId, $banking) {
                if ($validated['direction'] === 'drawer_to_bank') {
                    $banking->recordInflow(
                        $bankAccount,
                        $amount,
                        'Cash from drawer (Session #' . $session->id . ')' . ($validated['notes'] ? ': ' . $validated['notes'] : ''),
                        'cash_drawer_transfer',
                        CashDrawerSession::class,
                        $session->id,
                        $userId
                    );
                } else {
                    $banking->recordOutflow(
                        $bankAccount,
                        $amount,
                        'Cash to drawer (Session #' . $session->id . ')' . ($validated['notes'] ? ': ' . $validated['notes'] : ''),
                        'cash_drawer_transfer',
                        CashDrawerSession::class,
                        $session->id,
                        $userId
                    );
                }

                CashDrawerTransfer::create([
                    'cash_drawer_session_id' => $session->id,
                    'bank_account_id'        => $bankAccount->id,
                    'performed_by'           => $userId,
                    'direction'              => $validated['direction'],
                    'amount'                 => $amount,
                    'notes'                  => $validated['notes'] ?? null,
                ]);
            });
        } catch (InsufficientBalanceException $e) {
            return back()->with('error', $e->getMessage());
        }

        $dirLabel = $validated['direction'] === 'drawer_to_bank'
            ? 'Deposited to ' . $bankAccount->name
            : 'Withdrawn from ' . $bankAccount->name . ' to drawer';

        return back()->with('success', $dirLabel . ': ' . number_format($amount, 2));
    }

    /**
     * Show a specific session's detail.
     */
    public function show(CashDrawerSession $cashDrawer)
    {
        $cashDrawer->load('user');

        $sales = Sale::with('user')
            ->where('cash_drawer_session_id', $cashDrawer->id)
            ->where('status', 'completed')
            ->orderByDesc('sold_at')
            ->get();

        $transfers = CashDrawerTransfer::with(['bankAccount', 'performer'])
            ->where('cash_drawer_session_id', $cashDrawer->id)
            ->orderBy('created_at')
            ->get();

        $expenses = CashDrawerExpense::with('performer')
            ->where('cash_drawer_session_id', $cashDrawer->id)
            ->orderBy('created_at')
            ->get();

        $receipts = CashDrawerReceipt::with('performer')
            ->where('cash_drawer_session_id', $cashDrawer->id)
            ->orderBy('created_at')
            ->get();

        $debtPayments = DebtPayment::with(['customerDebt', 'receiver'])
            ->where('cash_drawer_session_id', $cashDrawer->id)
            ->orderBy('paid_at')
            ->get();

        $cashSalesTotal     = $sales->where('payment_method', 'cash')->sum('total');
        $totalChangeGiven   = $sales->sum('change_amount');
        $totalSalesAll      = $sales->sum('total');
        $transfersToBank    = $transfers->where('direction', 'drawer_to_bank')->sum('amount');
        $transfersFromBank  = $transfers->where('direction', 'bank_to_drawer')->sum('amount');
        $pettyExpenses      = $expenses->sum('amount');
        $cashReceiptsTotal  = $receipts->sum('amount');
        $cashDebtPayments   = $debtPayments->where('payment_method', 'cash')->sum('amount');
        $onlineDebtPayments = $debtPayments->where('payment_method', 'online')->sum('amount');

        $expectedCash = (float) $cashDrawer->opening_balance
            + (float) $cashSalesTotal
            + (float) $cashDebtPayments
            + (float) $cashReceiptsTotal
            - (float) $totalChangeGiven
            + (float) $transfersFromBank
            - (float) $transfersToBank
            - (float) $pettyExpenses;

        return Inertia::render('CashDrawer/Show', [
            'session'      => $cashDrawer,
            'sales'        => $sales,
            'transfers'    => $transfers,
            'expenses'     => $expenses,
            'receipts'     => $receipts,
            'debtPayments' => $debtPayments,
            'summary'      => [
                'cash_sales_total'           => round((float) $cashSalesTotal, 2),
                'total_sales_all'            => round((float) $totalSalesAll, 2),
                'total_change_given'         => round((float) $totalChangeGiven, 2),
                'transfers_to_bank'          => round((float) $transfersToBank, 2),
                'transfers_from_bank'        => round((float) $transfersFromBank, 2),
                'petty_cash_total'           => round((float) $pettyExpenses, 2),
                'cash_receipts_total'        => round((float) $cashReceiptsTotal, 2),
                'cash_debt_payments_total'   => round((float) $cashDebtPayments, 2),
                'online_debt_payments_total' => round((float) $onlineDebtPayments, 2),
                'expected_cash'              => round($expectedCash, 2),
            ],
        ]);
    }

    /**
     * Record a petty cash expense from the open drawer.
     */
    public function expense(Request $request)
    {
        $validated = $request->validate([
            'category'    => ['required', 'in:food,transport,supplies,maintenance,utilities,other'],
            'amount'      => ['required', 'numeric', 'min:0.01'],
            'description' => ['required', 'string', 'max:500'],
        ]);

        $session = CashDrawerSession::open()->first();

        if (!$session) {
            return back()->with('error', 'No open cash drawer session found.');
        }

        CashDrawerExpense::create([
            'cash_drawer_session_id' => $session->id,
            'performed_by'           => auth()->id(),
            'category'               => $validated['category'],
            'amount'                 => $validated['amount'],
            'description'            => $validated['description'],
        ]);

        return back()->with('success', 'Petty cash expense recorded: ' . number_format($validated['amount'], 2));
    }

    /**
     * Record a miscellaneous cash receipt (cash in) to the open drawer.
     */
    public function cashIn(Request $request)
    {
        $validated = $request->validate([
            'category'    => ['required', 'in:isp_collection,wifi_vendo_collection,other'],
            'amount'      => ['required', 'numeric', 'min:0.01'],
            'description' => ['required', 'string', 'max:500'],
        ]);

        $session = CashDrawerSession::open()->first();

        if (!$session) {
            return back()->with('error', 'No open cash drawer session found.');
        }

        CashDrawerReceipt::create([
            'cash_drawer_session_id' => $session->id,
            'performed_by'           => auth()->id(),
            'category'               => $validated['category'],
            'amount'                 => $validated['amount'],
            'description'            => $validated['description'],
        ]);

        return back()->with('success', 'Cash receipt recorded: ' . number_format($validated['amount'], 2));
    }
}
