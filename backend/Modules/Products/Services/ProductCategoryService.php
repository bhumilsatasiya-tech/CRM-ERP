<?php

namespace Modules\Products\Services;

use Illuminate\Support\Facades\DB;
use Modules\Products\Models\ProductCategory;
use RuntimeException;

class ProductCategoryService
{
    /** Returns the full tree (flat array, ordered, with depth + path filled). */
    public function tree(): array
    {
        return ProductCategory::query()
            ->orderBy('path')->orderBy('sort_order')->orderBy('name')
            ->get()
            ->toArray();
    }

    /** Lazy-load lookup for SmartDropdown (typeahead + scroll-to-load). */
    public function lookup(array $filters): array
    {
        $term   = (string) ($filters['q'] ?? '');
        $limit  = max(1, min((int) ($filters['limit'] ?? 10), 50));
        $offset = max(0, (int) ($filters['offset'] ?? 0));

        return ProductCategory::query()
            ->select(['id', 'company_id', 'parent_id', 'code', 'name', 'depth', 'path', 'is_active'])
            ->when($term !== '', function ($q) use ($term) {
                $like = "%{$term}%";
                $q->where(function ($qq) use ($like) {
                    $qq->where('code', 'like', $like)->orWhere('name', 'like', $like);
                });
            })
            ->orderBy('name')
            ->offset($offset)
            ->limit($limit)
            ->get()
            ->toArray();
    }

    public function create(array $data, ?int $actorId = null): ProductCategory
    {
        return DB::transaction(function () use ($data, $actorId) {
            $cat = ProductCategory::create(array_merge($data, [
                'created_by' => $actorId,
                'updated_by' => $actorId,
                'is_active'  => $data['is_active'] ?? true,
            ]));
            $this->syncDepthAndPath($cat);
            return $cat->refresh();
        });
    }

    public function update(ProductCategory $cat, array $data, ?int $actorId = null): ProductCategory
    {
        return DB::transaction(function () use ($cat, $data, $actorId) {
            // Prevent setting parent to self or any descendant
            if (! empty($data['parent_id']) && (int) $data['parent_id'] === (int) $cat->id) {
                throw new RuntimeException('A category cannot be its own parent.');
            }
            if (! empty($data['parent_id'])) {
                $newParent = ProductCategory::find($data['parent_id']);
                if ($newParent && str_contains($newParent->path ?? '', "/{$cat->id}/")) {
                    throw new RuntimeException('Cannot move a category under one of its own descendants.');
                }
            }
            $cat->fill($data);
            $cat->updated_by = $actorId;
            $cat->save();
            $this->syncDepthAndPath($cat);
            // Re-sync all descendants since their depth/path depends on this node
            foreach ($cat->children()->get() as $child) {
                $this->syncDepthAndPath($child, true);
            }
            return $cat->refresh();
        });
    }

    public function delete(ProductCategory $cat): void
    {
        if ($cat->children()->exists() || $cat->products()->exists()) {
            throw new RuntimeException('Cannot delete a category with children or products. Reassign first.');
        }
        DB::transaction(fn() => $cat->delete());
    }

    /** Recompute depth + materialized path string from parent. */
    private function syncDepthAndPath(ProductCategory $cat, bool $cascade = false): void
    {
        $parent = $cat->parent_id ? ProductCategory::find($cat->parent_id) : null;
        $depth  = $parent ? ((int) $parent->depth + 1) : 0;
        $path   = $parent
            ? rtrim($parent->path ?? "/{$parent->id}/", '/') . "/{$cat->id}/"
            : "/{$cat->id}/";

        if ($cat->depth !== $depth || $cat->path !== $path) {
            $cat->forceFill(['depth' => $depth, 'path' => $path])->save();
        }

        if ($cascade) {
            foreach ($cat->children()->get() as $child) {
                $this->syncDepthAndPath($child, true);
            }
        }
    }
}
