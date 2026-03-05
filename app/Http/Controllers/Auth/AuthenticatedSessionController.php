<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        return redirect()->intended($this->getHomeRoute());
    }

    /**
     * Determine the correct landing route for the authenticated user.
     * Falls back to the first module the user has permission to access.
     */
    private function getHomeRoute(): string
    {
        $user = Auth::user();

        // Admins and users with dashboard access always go to the dashboard.
        if ($user->is_admin || $user->hasPermissionTo('dashboard.view')) {
            return route('dashboard', absolute: false);
        }

        // Ordered list of fallback routes mapped to the permission required.
        $fallbacks = [
            'inventory.view'         => '/products',
            'inventory.build'        => '/assemblies',
            'inventory.create'       => '/products',
            'sales.create'           => '/sales/create',
            'sales.view'             => '/sales',
            'warranties.view'        => '/warranties',
            'banking.view'           => '/bank-accounts',
            'debts.view'             => '/debts',
            'customers.view'         => '/customers',
            'suppliers.view'         => '/suppliers',
            'purchasing.view'        => '/purchase-orders',
            'reports.view'           => '/reports',
            'users.view'             => '/users',
        ];

        foreach ($fallbacks as $permission => $path) {
            if ($user->hasPermissionTo($permission)) {
                return $path;
            }
        }

        // Last resort — profile page (always accessible when logged in).
        return route('profile.edit', absolute: false);
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }
}
