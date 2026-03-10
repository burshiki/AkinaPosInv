<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Customer extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'phone',
        'email',
        'address',
        'notes',
        'is_active',
        'loyalty_points',
        'loyalty_tier',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'loyalty_points' => 'integer',
        ];
    }

    public function sales()
    {
        return $this->hasMany(Sale::class);
    }

    public function debts()
    {
        return $this->hasMany(CustomerDebt::class);
    }

    public function loyaltyTransactions()
    {
        return $this->hasMany(LoyaltyTransaction::class);
    }

    public function addLoyaltyPoints(int $points, ?int $saleId = null, ?string $description = null): void
    {
        $this->increment('loyalty_points', $points);
        LoyaltyTransaction::create([
            'customer_id' => $this->id,
            'sale_id' => $saleId,
            'type' => 'earn',
            'points' => $points,
            'balance_after' => $this->fresh()->loyalty_points,
            'description' => $description,
        ]);
        $this->updateLoyaltyTier();
    }

    public function redeemLoyaltyPoints(int $points, ?int $saleId = null, ?string $description = null): bool
    {
        if ($this->loyalty_points < $points) return false;
        $this->decrement('loyalty_points', $points);
        LoyaltyTransaction::create([
            'customer_id' => $this->id,
            'sale_id' => $saleId,
            'type' => 'redeem',
            'points' => -$points,
            'balance_after' => $this->fresh()->loyalty_points,
            'description' => $description,
        ]);
        return true;
    }

    private function updateLoyaltyTier(): void
    {
        $totalEarned = $this->loyaltyTransactions()->where('type', 'earn')->sum('points');
        $tier = match (true) {
            $totalEarned >= 10000 => 'gold',
            $totalEarned >= 5000 => 'silver',
            default => 'standard',
        };
        if ($this->loyalty_tier !== $tier) {
            $this->update(['loyalty_tier' => $tier]);
        }
    }
}
