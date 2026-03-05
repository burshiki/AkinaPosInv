<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class BankAccountFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->company(),
            'type' => fake()->randomElement(['cash_drawer', 'gcash', 'maya', 'bdo', 'other']),
            'account_number' => fake()->bankAccountNumber(),
            'description' => fake()->sentence(),
            'balance' => fake()->randomFloat(2, 0, 10000),
            'is_active' => true,
        ];
    }
}
