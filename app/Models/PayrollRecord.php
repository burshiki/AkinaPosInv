<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PayrollRecord extends Model
{
    protected $fillable = [
        'payroll_period_id', 'employee_id', 'basic_pay', 'overtime_pay',
        'holiday_pay', 'allowances', 'gross_pay', 'sss_employee', 'philhealth_employee',
        'pagibig_employee', 'bir_withholding_tax', 'sss_employer', 'sss_ec',
        'philhealth_employer', 'pagibig_employer', 'late_deduction',
        'other_deductions', 'other_deductions_notes', 'cash_advance', 'loan_deduction', 'total_deductions',
        'net_pay', 'pay_type', 'basic_salary_snapshot', 'days_present',
        'days_absent', 'overtime_hours', 'status', 'paid_at', 'computed_by',
        'disbursement_source', 'disbursement_id', 'disbursement_notes',
    ];

    protected function casts(): array
    {
        return [
            'basic_pay' => 'decimal:2',
            'overtime_pay' => 'decimal:2',
            'holiday_pay' => 'decimal:2',
            'allowances' => 'decimal:2',
            'gross_pay' => 'decimal:2',
            'sss_employee' => 'decimal:2',
            'philhealth_employee' => 'decimal:2',
            'pagibig_employee' => 'decimal:2',
            'bir_withholding_tax' => 'decimal:2',
            'sss_employer' => 'decimal:2',
            'sss_ec' => 'decimal:2',
            'philhealth_employer' => 'decimal:2',
            'pagibig_employer' => 'decimal:2',
            'late_deduction' => 'decimal:2',
            'other_deductions' => 'decimal:2',
            'cash_advance' => 'decimal:2',
            'loan_deduction' => 'decimal:2',
            'total_deductions' => 'decimal:2',
            'net_pay' => 'decimal:2',
            'basic_salary_snapshot' => 'decimal:2',
            'days_present'   => 'decimal:2',
            'days_absent'    => 'decimal:2',
            'overtime_hours' => 'decimal:2',
            'paid_at' => 'datetime',
            'disbursement_id' => 'integer',
        ];
    }

    public function payrollPeriod()
    {
        return $this->belongsTo(PayrollPeriod::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function payslip()
    {
        return $this->hasOne(Payslip::class);
    }

    public function computedBy()
    {
        return $this->belongsTo(User::class, 'computed_by');
    }
}
