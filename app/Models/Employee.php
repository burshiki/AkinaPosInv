<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Employee extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id', 'employee_number', 'first_name', 'last_name', 'middle_name',
        'position', 'department', 'pay_type', 'basic_salary', 'standard_work_days',
        'monthly_divisor', 'hired_at', 'separated_at', 'sss_number', 'philhealth_number',
        'pagibig_number', 'tin', 'tax_status', 'phone', 'address', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'basic_salary' => 'decimal:2',
            'hired_at' => 'date',
            'separated_at' => 'date',
            'is_active' => 'boolean',
        ];
    }

    protected $appends = ['full_name', 'daily_rate'];

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    public function getDailyRateAttribute(): float
    {
        if ($this->pay_type === 'monthly') {
            return round((float) $this->basic_salary * 12 / ($this->monthly_divisor ?: 313), 2);
        }

        return (float) $this->basic_salary;
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function payrollRecords()
    {
        return $this->hasMany(PayrollRecord::class);
    }

    public function attendanceRecords()
    {
        return $this->hasMany(AttendanceRecord::class);
    }

    public function payslips()
    {
        return $this->hasMany(Payslip::class);
    }

    public function recurringDeductions()
    {
        return $this->hasMany(EmployeeRecurringDeduction::class);
    }

    public function leaveRequests()
    {
        return $this->hasMany(LeaveRequest::class);
    }

    public function leaveBalances()
    {
        return $this->hasMany(LeaveBalance::class);
    }
}
