<?php

namespace App\Http\Requests;

use App\Enums\FindingStatus;
use App\Models\P2hFinding;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Update beberapa temuan sekaligus (admin/manager). Field yang tidak dikirim
 * dibiarkan apa adanya pada setiap temuan.
 */
class BatchUpdateP2hFindingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manage', P2hFinding::class) ?? false;
    }

    public function rules(): array
    {
        // Sama dengan update satuan: menutup temuan yang belum closed wajib foto bukti
        $needsPhoto = $this->input('status') === FindingStatus::Closed->value
            && P2hFinding::whereIn('id', (array) $this->input('ids', []))
                ->where('status', '!=', FindingStatus::Closed->value)
                ->exists();

        return [
            'ids' => ['required', 'array', 'min:1', 'max:100'],
            'ids.*' => ['integer', Rule::exists('p2h_findings', 'id')],
            'status' => ['nullable', Rule::enum(FindingStatus::class)],
            'pic_user_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'target_selesai' => ['nullable', 'date_format:Y-m-d'],
            'tindakan_perbaikan' => ['nullable', 'string', 'max:1000'],
            'catatan_penutupan' => ['nullable', 'string', 'max:1000'],
            'foto_penutupan' => [$needsPhoto ? 'required' : 'nullable', 'image', 'max:5120'],
        ];
    }

    public function after(): array
    {
        return [function ($validator) {
            if (! $this->filled('status') && ! $this->filled('pic_user_id') && ! $this->filled('target_selesai') && ! $this->filled('tindakan_perbaikan')) {
                $validator->errors()->add('status', 'Pilih minimal satu perubahan untuk diterapkan.');
            }
        }];
    }

    public function messages(): array
    {
        return [
            'foto_penutupan.required' => 'Foto bukti perbaikan wajib diunggah untuk menutup temuan.',
        ];
    }
}
