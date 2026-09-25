<?php

namespace App\Http\Requests;

use App\Enums\FindingStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateP2hFindingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('finding')) ?? false;
    }

    public function rules(): array
    {
        // Setiap kali temuan ditutup (termasuk ditutup ulang setelah dibuka kembali) wajib
        // foto bukti perbaikan baru; edit temuan yang sudah closed tidak perlu foto ulang
        $needsPhoto = $this->input('status') === FindingStatus::Closed->value
            && $this->route('finding')?->status !== FindingStatus::Closed;

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
