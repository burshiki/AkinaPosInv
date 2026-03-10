<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payslip extends Model
{
    protected $fillable = [
        'payroll_record_id', 'employee_id', 'payroll_period_id',
        'payslip_number', 'generated_at', 'generated_by',
    ];

    protected function casts(): array
    {
        return [
            'generated_at' => 'datetime',
        ];
    }

    public function payrollRecord()
    {
        return $this->belongsTo(PayrollRecord::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function payrollPeriod()
    {
        return $this->belongsTo(PayrollPeriod::class);
    }

    public function generatedBy()
    {
        return $this->belongsTo(User::class, 'generated_by');
    }
}
