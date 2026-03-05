<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\User;
use Inertia\Inertia;
use Spatie\Permission\Models\Permission;

class UserController extends Controller
{
    public function index()
    {
        return Inertia::render('Users/Index', [
            'users' => User::with('permissions')->orderBy('name')->get()->map(fn ($u) => [
                ...$u->toArray(),
                'permissions' => $u->getAllPermissions()->pluck('name'),
            ]),
            'allPermissions' => $this->getGroupedPermissions(),
        ]);
    }

    public function create()
    {

        return Inertia::render('Users/Create', [
            'allPermissions' => $this->getGroupedPermissions(),
        ]);
    }

    public function store(StoreUserRequest $request)
    {

        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => bcrypt($request->password),
            'is_admin' => $request->boolean('is_admin'),
        ]);

        if (!$user->is_admin) {
            $user->syncPermissions($request->permissions ?? []);
        }

        return redirect()->route('users.index')
            ->with('success', "User {$user->name} created.");
    }

    public function edit(User $user)
    {

        return Inertia::render('Users/Edit', [
            'user' => [
                ...$user->toArray(),
                'permissions' => $user->getAllPermissions()->pluck('name'),
            ],
            'allPermissions' => $this->getGroupedPermissions(),
        ]);
    }

    public function update(UpdateUserRequest $request, User $user)
    {

        $user->update([
            'name'     => $request->name,
            'email'    => $request->email,
            'is_admin' => $request->boolean('is_admin'),
        ]);

        if ($request->password) {
            $user->update(['password' => bcrypt($request->password)]);
        }

        if (!$request->boolean('is_admin')) {
            $user->syncPermissions($request->permissions ?? []);
        } else {
            $user->syncPermissions([]);
        }

        return redirect()->route('users.index')
            ->with('success', "User {$user->name} updated.");
    }

    public function destroy(User $user)
    {

        if ($user->is_admin) {
            return back()->with('error', 'Cannot delete admin user.');
        }

        $user->delete();

        return redirect()->route('users.index')
            ->with('success', 'User deleted.');
    }

    private function getGroupedPermissions(): array
    {
        return Permission::all()
            ->map(fn ($p) => [
                'name'  => $p->name,
                'group' => explode('.', $p->name)[0],
            ])
            ->values()
            ->toArray();
    }
}
