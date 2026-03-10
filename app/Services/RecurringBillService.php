<?php

namespace App\Services;

use App\Models\Bill;
use App\Models\RecurringBillTemplate;
use App\Models\Supplier;
use Illuminate\Support\Facades\DB;

class RecurringBillService
{
    public function __construct(
        protected AccountsPayableService $apService
    ) {}

    public function generateDueBills(): int
    {
        $templates = RecurringBillTemplate::where('is_active', true)
            ->whereDate('next_generate_date', '<=', now()->toDateString())
            ->where(function ($q) {
                $q->whereNull('end_date')
                  ->orWhereDate('end_date', '>=', now()->toDateString());
            })
            ->get();

        $count = 0;
        foreach ($templates as $template) {
            DB::transaction(function () use ($template, &$count) {
                $bill = Bill::create([
                    'bill_number'                => $this->apService->generateBillNumber(),
                    'supplier_id'                => $template->supplier_id,
                    'supplier_name'              => $template->supplier_name ?? $template->supplier?->name ?? 'Unknown',
                    'recurring_bill_template_id' => $template->id,
                    'category'                   => $template->category,
                    'subtotal'                   => $template->amount,
                    'tax_amount'                 => 0,
                    'total_amount'               => $template->amount,
                    'paid_amount'                => 0,
                    'balance'                    => $template->amount,
                    'status'                     => 'unpaid',
                    'bill_date'                  => $template->next_generate_date,
                    'due_date'                   => $template->next_generate_date->copy()->setDay($template->due_day_of_month),
                    'notes'                      => "Auto-generated from recurring template: {$template->name}",
                    'created_by'                 => $template->created_by,
                ]);

                $bill->items()->create([
                    'description' => $template->name,
                    'quantity'    => 1,
                    'unit_price'  => $template->amount,
                    'amount'      => $template->amount,
                ]);

                // Advance next_generate_date
                $next = match ($template->frequency) {
                    'monthly'   => $template->next_generate_date->copy()->addMonth(),
                    'quarterly' => $template->next_generate_date->copy()->addMonths(3),
                    'annually'  => $template->next_generate_date->copy()->addYear(),
                };

                $template->update(['next_generate_date' => $next]);
                $count++;
            });
        }

        return $count;
    }

    public function createTemplate(array $data, int $userId): RecurringBillTemplate
    {
        $supplier = isset($data['supplier_id']) ? Supplier::find($data['supplier_id']) : null;

        return RecurringBillTemplate::create([
            'name'               => $data['name'],
            'supplier_id'        => $data['supplier_id'] ?? null,
            'supplier_name'      => $supplier?->name ?? ($data['supplier_name'] ?? null),
            'category'           => $data['category'],
            'amount'             => $data['amount'],
            'frequency'          => $data['frequency'],
            'day_of_month'       => $data['day_of_month'] ?? 1,
            'due_day_of_month'   => $data['due_day_of_month'] ?? 1,
            'start_date'         => $data['start_date'],
            'end_date'           => $data['end_date'] ?? null,
            'next_generate_date' => $data['start_date'],
            'is_active'          => true,
            'notes'              => $data['notes'] ?? null,
            'created_by'         => $userId,
        ]);
    }

    public function updateTemplate(RecurringBillTemplate $template, array $data): RecurringBillTemplate
    {
        $supplier = isset($data['supplier_id']) ? Supplier::find($data['supplier_id']) : null;

        $template->update([
            'name'               => $data['name'],
            'supplier_id'        => $data['supplier_id'] ?? $template->supplier_id,
            'supplier_name'      => $supplier?->name ?? ($data['supplier_name'] ?? $template->supplier_name),
            'category'           => $data['category'],
            'amount'             => $data['amount'],
            'frequency'          => $data['frequency'],
            'day_of_month'       => $data['day_of_month'] ?? $template->day_of_month,
            'due_day_of_month'   => $data['due_day_of_month'] ?? $template->due_day_of_month,
            'start_date'         => $data['start_date'] ?? $template->start_date,
            'end_date'           => $data['end_date'] ?? $template->end_date,
            'notes'              => $data['notes'] ?? $template->notes,
        ]);

        return $template;
    }

    public function deactivateTemplate(RecurringBillTemplate $template): void
    {
        $template->update(['is_active' => false]);
    }
}
