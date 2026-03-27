<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AttendanceRecord extends Model
{
    protected $fillable = [
        'employee_id', 'payroll_period_id', 'days_present', 'days_absent',
        'days_late', 'overtime_hours', 'hours_late',
        'regular_holidays_not_worked', 'regular_holidays_worked',
        'special_holidays_worked', 'regular_holidays_restday_worked',
        'special_holidays_restday_worked', 'notes', 'recorded_by',
    ];

    protected function casts(): array
    {
        return [
            'days_present'   => 'decimal:2',
            'days_absent'    => 'decimal:2',
            'overtime_hours' => 'decimal:2',
            'hours_late'    => 'decimal:2',
        ];
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function payrollPeriod()
    {
        return $this->belongsTo(PayrollPeriod::class);
    }

    public function recordedBy()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
