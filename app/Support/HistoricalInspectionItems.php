<?php

namespace App\Support;

use Illuminate\Support\Collection;

class HistoricalInspectionItems
{
    public static function fromEntries(Collection $entries): Collection
    {
        return $entries
            ->flatMap(fn ($entry) => $entry->answers)
            ->unique('inspection_item_id')
            ->map(function ($answer) {
                $item = $answer->inspectionItem;

                return (object) [
                    'id' => $answer->inspection_item_id,
                    'section' => $answer->item_section ?? $item?->section ?? 'C',
                    'nama_item' => $answer->item_nama ?? $item?->nama_item ?? 'Item tidak tersedia',
                    'kode_bahaya' => $answer->item_kode_bahaya ?? $item?->kode_bahaya ?? '-',
                    'urutan' => $answer->item_urutan ?? $item?->urutan ?? PHP_INT_MAX,
                ];
            })
            ->sortBy(fn ($item) => [$item->section, $item->urutan, $item->id])
            ->values();
    }
}
