<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreP2hRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'unit_id'                           => ['required', 'integer', 'exists:units,id', Rule::exists('units', 'id')->where('status', 'active')],
            'job_site'                          => ['nullable', 'string', 'max:100'],
            'lokasi_kerja'                      => ['nullable', 'string', 'max:100'],
            'km_awal'                           => ['nullable', 'integer', 'min:0'],
            'hm_km_akhir'                       => ['nullable', 'integer', 'min:0'],
            'shift'                             => ['required', Rule::in(['Shift I', 'Shift II'])],
            'paraf'                             => ['required', 'string'],
            'answers'                           => ['required', 'array', 'size:' . \App\Models\P2hInspectionItem::active()->count()],
            'answers.*.inspection_item_id'      => ['required', 'integer', 'exists:p2h_inspection_items,id'],
            'answers.*.kondisi'                 => ['required', Rule::in(['Layak', 'Tidak Layak'])],
            'answers.*.keterangan'              => ['nullable', 'string', 'required_if:answers.*.kondisi,Tidak Layak'],
            'service_info'                      => ['nullable', 'array'],
            'service_info.servis_mingguan'      => ['nullable', 'boolean'],
            'service_info.servis_berkala'       => ['nullable', 'boolean'],
            'service_info.unschedule_breakdown' => ['nullable', 'boolean'],
            'service_info.lainnya'              => ['nullable', 'string'],
            'service_info.catatan_servis'       => ['nullable', 'string'],
            'fuel_log'                          => ['nullable', 'array'],
            'fuel_log.km_unit'                  => ['nullable', 'integer', 'min:0'],
            'fuel_log.jumlah_liter'             => ['nullable', 'numeric', 'min:0'],
            // Final justification oleh operator
            'kondisi_akhir'                     => ['required', Rule::in(['Layak Pakai', 'BD'])],
            'justifikasi_kondisi'               => [
                'nullable',
                'string',
                'max:500',
                Rule::requiredIf(fn () => $this->isOverrideDecision()),
            ],
        ];
    }

    public function isOverrideDecision(): bool
    {
        $kondisiAkhir = $this->input('kondisi_akhir');
        if (! $kondisiAkhir) {
            return false;
        }

        $answers = $this->input('answers', []);
        $total   = count($answers);
        if ($total === 0) {
            return false;
        }

        $answerCollection = collect($answers);
        $tidakLayakIds    = $answerCollection->where('kondisi', 'Tidak Layak')->pluck('inspection_item_id');

        $hasAACritical = \App\Models\P2hInspectionItem::whereIn('id', $tidakLayakIds)
            ->where('kode_bahaya', 'AA')
            ->exists();

        $layak    = $answerCollection->where('kondisi', 'Layak')->count();
        $score    = ($layak / $total) * 100;
        $recommended = ($hasAACritical || $score < 80) ? 'BD' : 'Layak Pakai';

        return $kondisiAkhir !== $recommended;
    }
}
