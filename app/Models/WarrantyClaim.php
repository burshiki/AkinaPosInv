<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WarrantyClaim extends Model
{
    protected $fillable = [
        'warranty_id',
        'claim_number',
        'issue_description',
        'status',
        'resolution_type',
        'supplier_id',
        'tracking_number',
        'received_serial_number',
        'resolution_notes',
        'resolved_at',
        'defective_status',
        'defective_supplier_id',
        'defective_tracking_number',
        'defective_received_at',
    ];

    protected function casts(): array
    {
        return [
            'resolved_at'          => 'datetime',
            'defective_received_at' => 'datetime',
        ];
    }

    public function warranty()
    {
        return $this->belongsTo(Warranty::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function defectiveSupplier()
    {
        return $this->belongsTo(Supplier::class, 'defective_supplier_id');
    }

    public function isActive(): bool
    {
        return in_array($this->status, ['open', 'confirmed', 'in_repair']);
    }
}
