<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class SaleFactory extends Factory
{
    public function definition(): array
    {
        return [
            'receipt_number' => 'RCP-' . now()->format('Ymd') . '-' . str_pad(fake()->unique()->numberBetween(1, 9999), 4, '0', STR_PAD_LEFT),
            'user_id' => User::factory(),
            'customer_name' => fake()->name(),
            'customer_phone' => fake()->phoneNumber(),
            'payment_method' => 'cash',
            'bank_account_id' => null,
            'subtotal' => 0,
            'discount_amount' => 0,
            'total' => 0,
            'amount_tendered' => null,
            'change_amount' => null,
            'status' => 'completed',
            'sold_at' => now(),
        ];
    }
}
