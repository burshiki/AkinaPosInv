<?php

namespace App\Jobs;

use App\Models\Product;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class LowStockAlertJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $productId
    ) {}

    public function handle(): void
    {
        $product = Product::find($this->productId);
        if (!$product || !$product->isLowStock()) {
            return;
        }

        $adminEmail = config('mail.admin_email', config('mail.from.address'));
        if (!$adminEmail) {
            Log::warning("Low stock alert: {$product->name} (qty: {$product->stock_quantity}) - no admin email configured.");
            return;
        }

        Mail::raw(
            "Low Stock Alert\n\n" .
            "Product: {$product->name}\n" .
            "SKU: {$product->sku}\n" .
            "Current Stock: {$product->stock_quantity}\n" .
            "Threshold: {$product->low_stock_threshold}\n\n" .
            "Please reorder this item.",
            function ($message) use ($adminEmail, $product) {
                $message->to($adminEmail)
                    ->subject("Low Stock Alert: {$product->name} ({$product->stock_quantity} remaining)");
            }
        );
    }
}
