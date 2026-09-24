<?php

namespace App\Http\Requests;

use App\Enums\FindingStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateP2hFindingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasAnyRole(['admin', 'manager']) ?? false;
    }

    public function rules(): array
    {
        // Menutup temuan wajib disertai foto bukti perbaikan (kecuali sudah pernah diunggah)
        $needsPhoto = $this->input('status') === FindingStatus::Closed->value
            && blank($this->route('finding')?->foto_penutupan);

        return [
            'tindakan_perbaikan' => ['nullable', 'string', 'max:1000'],
            'pic_user_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'target_selesai' => ['nullable', 'date_format:Y-m-d'],
            'status' => ['required', Rule::enum(FindingStatus::class)],
            'catatan_penutupan' => ['nullable', 'string', 'max:1000'],
            'foto_penutupan' => [$needsPhoto ? 'required' : 'nullable', 'image', 'max:5120'],
        ];
    }

    public function messages(): array
    {
        return [
            'foto_penutupan.required' => 'Foto bukti perbaikan wajib diunggah untuk menutup temuan.',
        ];
    }
}
