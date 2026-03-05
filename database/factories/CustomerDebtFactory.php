<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class CustomerDebtFactory extends Factory
{
    public function definition(): array
    {
        $total = fake()->randomFloat(2, 50, 1000);
        return [
            'customer_name' => fake()->name(),
            'customer_phone' => fake()->phoneNumber(),
            'sale_id' => null,
            'total_amount' => $total,
            'paid_amount' => 0,
            'balance' => $total,
            'status' => 'unpaid',
            'due_date' => fake()->optional()->dateTimeBetween('now', '+30 days'),
        ];
    }
}
