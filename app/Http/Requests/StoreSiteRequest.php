<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSiteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasAnyRole(['admin', 'manager']) ?? false;
    }

    public function rules(): array
    {
        $siteId = $this->route('site')?->id;

        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('sites', 'name')->ignore($siteId)],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ];
    }
}
