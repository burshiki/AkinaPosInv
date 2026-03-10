<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RecurringBillTemplate extends Model
{
    protected $fillable = [
        'name',
        'supplier_id',
        'supplier_name',
        'category',
        'amount',
        'frequency',
        'day_of_month',
        'due_day_of_month',
        'start_date',
        'end_date',
        'next_generate_date',
        'is_active',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'amount'             => 'decimal:2',
            'day_of_month'       => 'integer',
            'due_day_of_month'   => 'integer',
            'start_date'         => 'date',
            'end_date'           => 'date',
            'next_generate_date' => 'date',
            'is_active'          => 'boolean',
        ];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function bills(): HasMany
    {
        return $this->hasMany(Bill::class, 'recurring_bill_template_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
