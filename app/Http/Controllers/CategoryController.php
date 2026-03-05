<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCategoryRequest;
use App\Models\Category;
use Inertia\Inertia;

class CategoryController extends Controller
{
    public function index()
    {
        return Inertia::render('Categories/Index', [
            'categories' => Category::withCount('products')
                ->orderBy('sort_order')
                ->get(),
        ]);
    }

    public function store(StoreCategoryRequest $request)
    {

        Category::create($request->validated());

        return back()->with('success', 'Category created.');
    }

    public function update(StoreCategoryRequest $request, Category $category)
    {

        $category->update($request->validated());

        return back()->with('success', 'Category updated.');
    }

    public function destroy(Category $category)
    {

        $category->delete();

        return back()->with('success', 'Category deleted.');
    }
}
