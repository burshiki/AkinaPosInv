<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class EmployeeFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'employee_number' => strtoupper(fake()->unique()->bothify('EMP-####')),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'position' => fake()->jobTitle(),
            'department' => fake()->randomElement(['Sales', 'Admin', 'Warehouse']),
            'pay_type' => 'daily',
            'basic_salary' => 600.00,
            'standard_work_days' => 26,
            'monthly_divisor' => 313,
            'hired_at' => fake()->date(),
            'sss_number' => fake()->numerify('##-#######-#'),
            'philhealth_number' => fake()->numerify('##-#########-#'),
            'pagibig_number' => fake()->numerify('####-####-####'),
            'tin' => fake()->numerify('###-###-###-###'),
            'tax_status' => 'S',
            'is_active' => true,
        ];
    }

    public function monthly(float $salary = 15000.00): static
    {
        return $this->state(fn () => [
            'pay_type' => 'monthly',
            'basic_salary' => $salary,
        ]);
    }

    public function daily(float $rate = 600.00): static
    {
        return $this->state(fn () => [
            'pay_type' => 'daily',
            'basic_salary' => $rate,
        ]);
    }
}
