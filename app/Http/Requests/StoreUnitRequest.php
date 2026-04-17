<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUnitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $unitId = $this->route('unit')?->id;

        return [
            'no_unit'    => ['required', 'string', Rule::unique('units', 'no_unit')->ignore($unitId)],
            'jenis_unit' => ['required', Rule::in(['Bus', 'Light Vehicle'])],
            'no_lambung' => ['nullable', 'string', 'max:50'],
            'status'     => ['required', Rule::in(['active', 'inactive'])],
        ];
    }
}
