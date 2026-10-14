<?php

namespace App\Http\Controllers\Concerns;

use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * Sorting tabel dari query string `?sort=<kolom>&dir=asc|desc`.
 * Hanya kolom yang terdaftar di whitelist yang diterima.
 */
trait SortsTable
{
    /**
     * Baca parameter sort dari request dan validasi terhadap whitelist.
     *
     * @param  array<int, string>  $allowed
     * @return array{by: string, dir: string}
     */
    protected function sortState(Request $request, array $allowed, string $default, string $defaultDir = 'asc'): array
    {
        $by = $request->string('sort')->toString();
        $dir = strtolower($request->string('dir')->toString());

        if (! in_array($by, $allowed, true)) {
            return ['by' => $default, 'dir' => $defaultDir];
        }

        return ['by' => $by, 'dir' => $dir === 'desc' ? 'desc' : 'asc'];
    }

    /**
     * Terapkan sort ke query. `$columns` memetakan key sort ke kolom DB
     * atau closure `fn ($query, string $dir)` untuk kasus khusus (relasi, dll).
     *
     * @param  array<string, string|Closure>  $columns
     * @return array{by: string, dir: string}
     */
    protected function applySort(Builder $query, Request $request, array $columns, string $default, string $defaultDir = 'asc'): array
    {
        $sort = $this->sortState($request, array_keys($columns), $default, $defaultDir);
        $column = $columns[$sort['by']];

        if ($column instanceof Closure) {
            $column($query, $sort['dir']);
        } else {
            $query->orderBy($column, $sort['dir']);
        }

        // Tie-breaker agar urutan antar halaman paginasi stabil
        $query->orderBy($query->getModel()->getQualifiedKeyName(), $sort['dir']);

        return $sort;
    }
}
