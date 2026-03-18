<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SettingController extends Controller
{
    public function index()
    {
        return Inertia::render('Settings/Index', [
            'receipt_note' => Setting::get('receipt_note', ''),
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'receipt_note' => ['nullable', 'string', 'max:500'],
        ]);

        Setting::set('receipt_note', $validated['receipt_note'] ?? '');

        return back()->with('success', 'Settings saved.');
    }
}
