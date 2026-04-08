<?php

namespace App\Services;

use App\Exceptions\InsufficientBalanceException;
use App\Models\BankAccount;
use App\Models\BankAccountLedger;
use Illuminate\Support\Facades\DB;

class BankingService
{
    public function recordInflow(
        BankAccount $account,
        float $amount,
        string $description,
        string $category,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?int $performedBy = null
    ): BankAccountLedger {
        return DB::transaction(function () use (
            $account, $amount, $description, $category,
            $referenceType, $referenceId, $performedBy
        ) {
            $account->increment('balance', $amount);

            return BankAccountLedger::create([
                'bank_account_id' => $account->id,
                'type'            => 'in',
                'amount'          => $amount,
                'running_balance' => $account->fresh()->balance,
                'description'     => $description,
                'category'        => $category,
                'reference_type'  => $referenceType,
                'reference_id'    => $referenceId,
                'performed_by'    => $performedBy,
                'transacted_at'   => now(),
            ]);
        });
    }

    public function recordOutflow(
        BankAccount $account,
        float $amount,
        string $description,
        string $category,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?int $performedBy = null
    ): BankAccountLedger {
        return DB::transaction(function () use (
            $account, $amount, $description, $category,
            $referenceType, $referenceId, $performedBy
        ) {
            if ($account->balance < $amount) {
                throw new InsufficientBalanceException(
                    "Insufficient balance in {$account->name}: " .
                    "need {$amount}, have {$account->balance}"
                );
            }

            $account->decrement('balance', $amount);

            return BankAccountLedger::create([
                'bank_account_id' => $account->id,
                'type'            => 'out',
                'amount'          => $amount,
                'running_balance' => $account->fresh()->balance,
                'description'     => $description,
                'category'        => $category,
                'reference_type'  => $referenceType,
                'reference_id'    => $referenceId,
                'performed_by'    => $performedBy,
                'transacted_at'   => now(),
            ]);
        });
    }

    public function transfer(
        BankAccount $from,
        BankAccount $to,
        float $amount,
        int $performedBy,
        float $fee = 0.0
    ): array {
        return DB::transaction(function () use ($from, $to, $amount, $performedBy, $fee) {
            // If balance can cover the transfer but not the fee on top,
            // deduct the fee from the transfer amount instead (fee-inclusive mode).
            $feeInclusive = false;
            $netAmount = $amount;

            if ($fee > 0 && $from->balance >= $amount && $from->balance < $amount + $fee) {
                $netAmount = $amount - $fee;
                if ($netAmount <= 0) {
                    throw new InsufficientBalanceException(
                        "Transfer amount in {$from->name} is too small to cover the transfer fee of ₱{$fee}."
                    );
                }
                $feeInclusive = true;
            }

            $outEntry = $this->recordOutflow(
                $from, $netAmount,
                "Transfer to {$to->name}",
                'transfer',
                BankAccount::class, $to->id, $performedBy
            );

            $inEntry = $this->recordInflow(
                $to, $netAmount,
                "Transfer from {$from->name}",
                'transfer',
                BankAccount::class, $from->id, $performedBy
            );

            $feeEntry = null;
            if ($fee > 0) {
                $feeEntry = $this->recordOutflow(
                    $from, $fee,
                    "Transfer fee (to {$to->name})",
                    'transfer_fee',
                    BankAccount::class, $to->id, $performedBy
                );
            }

            return ['out' => $outEntry, 'in' => $inEntry, 'fee' => $feeEntry, 'fee_inclusive' => $feeInclusive, 'net_amount' => $netAmount];
        });
    }

    public function updateManualEntry(
        BankAccountLedger $entry,
        string $type,
        float $amount,
        string $description,
        string $category
    ): BankAccountLedger {
        if ($entry->reference_type !== null) {
            throw new \RuntimeException('Only manual ledger entries can be edited.');
        }

        return DB::transaction(function () use ($entry, $type, $amount, $description, $category) {
            $oldEffect = $entry->type === 'in' ? (float) $entry->amount : -(float) $entry->amount;
            $newEffect = $type === 'in' ? $amount : -$amount;
            $delta = $newEffect - $oldEffect;

            $entry->update([
                'type'        => $type,
                'amount'      => $amount,
                'description' => $description,
                'category'    => $category,
            ]);

            // Cascade running_balance forward from this entry (inclusive)
            BankAccountLedger::where('bank_account_id', $entry->bank_account_id)
                ->where(function ($q) use ($entry) {
                    $q->where('transacted_at', '>', $entry->transacted_at)
                        ->orWhere(function ($q2) use ($entry) {
                            $q2->where('transacted_at', $entry->transacted_at)
                                ->where('id', '>=', $entry->id);
                        });
                })
                ->increment('running_balance', $delta);

            DB::table('bank_accounts')
                ->where('id', $entry->bank_account_id)
                ->increment('balance', $delta);

            return $entry->fresh();
        });
    }

    public function getAccountSummary(BankAccount $account, ?string $from = null, ?string $to = null): array
    {
        $query = $account->ledgerEntries();

        if ($from) {
            $query->where('transacted_at', '>=', $from);
        }
        if ($to) {
            $query->where('transacted_at', '<=', $to);
        }

        $totalIn = (clone $query)->where('type', 'in')->sum('amount');
        $totalOut = (clone $query)->where('type', 'out')->sum('amount');

        return [
            'account' => $account,
            'total_in' => $totalIn,
            'total_out' => $totalOut,
            'net' => $totalIn - $totalOut,
            'current_balance' => $account->balance,
        ];
    }
}
