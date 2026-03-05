<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductFactory extends Factory
{
    public function definition(): array
    {
        return [
            'category_id' => Category::factory(),
            'name' => fake()->words(3, true),
            'sku' => strtoupper(fake()->unique()->bothify('SKU-####-??')),
            'barcode' => fake()->unique()->ean13(),
            'description' => fake()->sentence(),
            'cost_price' => fake()->randomFloat(2, 10, 500),
            'selling_price' => fake()->randomFloat(2, 50, 1000),
            'stock_quantity' => fake()->numberBetween(0, 100),
            'low_stock_threshold' => 5,
            'is_assembled' => false,
            'is_active' => true,
        ];
    }

    public function assembled(): static
    {
        return $this->state(fn () => [
            'is_assembled' => true,
            'stock_quantity' => 0,
        ]);
    }
}
