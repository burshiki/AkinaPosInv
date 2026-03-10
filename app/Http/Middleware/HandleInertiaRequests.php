<?php

namespace App\Http\Middleware;

use App\Models\InventorySession;
use App\Models\PurchaseOrder;
use App\Models\Warranty;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user() ? [
                    'id'          => $request->user()->id,
                    'name'        => $request->user()->name,
                    'email'       => $request->user()->email,
                    'is_admin'    => $request->user()->is_admin,
                    'permissions' => $request->user()
                        ->getAllPermissions()
                        ->pluck('name'),
                ] : null,
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error'   => fn () => $request->session()->get('error'),
            ],
            'app' => [
                'timezone' => config('app.timezone'),
                'name'     => config('app.name'),
            ],
            'warrantyPendingCount' => fn () => $request->user()
                ? Warranty::pending()->count()
                : 0,
            'poPendingApprovalCount' => fn () => $request->user() && $request->user()->getAllPermissions()->contains('name', 'purchasing.approve')
                ? PurchaseOrder::where('status', 'draft')->count()
                : 0,
            'inventoryMode' => fn () => InventorySession::isActive(),
        ];
    }
}
