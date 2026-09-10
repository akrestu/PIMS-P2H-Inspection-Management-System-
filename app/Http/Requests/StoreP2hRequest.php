<?php

namespace App\Http\Requests;

use App\Models\AppSetting;
use App\Models\P2hInspectionItem;
use App\Models\Unit;
use App\Models\User;
use App\Rules\ValidSignatureDataUrl;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreP2hRequest extends FormRequest
{
    public function authorize(): bool
    {
        $unit = Unit::find($this->integer('unit_id'));

        return $unit !== null && $this->user()?->canAccessP2hUnit($unit) === true;
    }

    public function rules(): array
    {
        return [
            'unit_id' => ['required', 'integer', Rule::exists('units', 'id')->where('status', 'active')->whereNull('deleted_at')],
            'pic_approver_id' => $this->requiresPicApprover()
                ? ['required', 'integer', Rule::exists('users', 'id')]
                : ['nullable', 'integer'],
            'job_site' => ['nullable', 'string', 'max:100', Rule::exists('sites', 'name')->where('status', 'active')],
            'lokasi_kerja' => ['nullable', 'string', 'max:100'],
            'km_awal' => ['nullable', 'integer', 'min:0'],
            'hm_km_akhir' => ['nullable', 'integer', 'min:0'],
            'shift' => ['required', Rule::in(AppSetting::shifts())],
            'paraf' => ['required', new ValidSignatureDataUrl],
            'answers' => ['required', 'array', 'size:'.P2hInspectionItem::active()->count()],
            'answers.*.inspection_item_id' => [
                'required',
                'integer',
                'distinct',
                Rule::exists('p2h_inspection_items', 'id')->where('is_active', true),
            ],
            'answers.*.kondisi' => ['required', Rule::in(['Layak', 'Tidak Layak'])],
            'answers.*.keterangan' => ['nullable', 'string', 'max:255'],
            'service_info' => ['nullable', 'array'],
            'service_info.servis_mingguan' => ['nullable', 'boolean'],
            'service_info.servis_berkala' => ['nullable', 'boolean'],
            'service_info.unschedule_breakdown' => ['nullable', 'boolean'],
            'service_info.lainnya' => ['nullable', 'string', 'max:255'],
            'service_info.catatan_servis' => ['nullable', 'string'],
            'fuel_log' => ['nullable', 'array'],
            'fuel_log.km_unit' => ['nullable', 'integer', 'min:0'],
            'fuel_log.jumlah_liter' => ['nullable', 'numeric', 'min:0', 'max:999999.99'],
            // Attachments
            'attachments' => ['nullable', 'array', 'max:10'],
            'attachments.*' => ['image', 'max:5120'],
            'item_attachments' => ['nullable', 'array', 'max:50'],
            'item_attachments.*' => ['nullable', 'array', 'max:5'],
            'item_attachments.*.*' => ['image', 'max:5120'],
            // Final justification oleh operator
            'kondisi_akhir' => ['required', Rule::in(['Layak Pakai', 'BD'])],
            'justifikasi_kondisi' => [
                'nullable',
                'string',
                'max:500',
                Rule::requiredIf(fn () => $this->isOverrideDecision()),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'pic_approver_id.required' => 'PIC yang akan menyetujui P2H wajib dipilih.',
            'pic_approver_id.exists' => 'PIC yang dipilih tidak valid atau bukan dari departemen yang sama dengan unit.',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            $expectedIds = P2hInspectionItem::active()->pluck('id')->sort()->values();
            $submittedIds = collect($this->input('answers', []))
                ->pluck('inspection_item_id')
                ->filter(fn ($id) => is_numeric($id))
                ->map(fn ($id) => (int) $id)
                ->sort()
                ->values();

            if ($submittedIds->all() !== $expectedIds->all()) {
                $v->errors()->add('answers', 'Semua item checklist aktif harus dijawab tepat satu kali.');
            }

            $attachmentItemIds = collect(array_keys($this->file('item_attachments', [])))
                ->map(fn ($id) => filter_var($id, FILTER_VALIDATE_INT))
                ->filter(fn ($id) => $id !== false)
                ->map(fn ($id) => (int) $id)
                ->sort()
                ->values();

            if ($attachmentItemIds->contains(fn (int $id) => ! $expectedIds->contains($id))) {
                $v->errors()->add('item_attachments', 'Lampiran hanya boleh dikaitkan dengan item checklist aktif.');
            }

            $allFiles = collect($this->file('attachments', []))
                ->concat(collect($this->file('item_attachments', []))->flatten());
            if ($allFiles->count() > 30) {
                $v->errors()->add('attachments', 'Total lampiran maksimal 30 file per pengisian.');
            }
            if ($allFiles->sum(fn ($file) => $file->getSize()) > 50 * 1024 * 1024) {
                $v->errors()->add('attachments', 'Total ukuran seluruh lampiran maksimal 50 MB.');
            }

            foreach ($this->input('answers', []) as $i => $ans) {
                if (($ans['kondisi'] ?? null) === 'Tidak Layak' && empty(trim($ans['keterangan'] ?? ''))) {
                    $v->errors()->add("answers.$i.keterangan", 'Keterangan wajib diisi untuk item Tidak Layak.');
                }
            }

            if ($this->requiresPicApprover() && $this->filled('pic_approver_id')) {
                $pic = User::find($this->integer('pic_approver_id'));
                $unit = Unit::find($this->integer('unit_id'));
                $validPic = $pic
                    && $pic->id !== $this->user()?->id
                    && $pic->hasRole('driver')
                    && $pic->jabatan === $this->getRequiredPicJabatan()
                    && $pic->department === $unit?->department
                    && ($unit?->site_id === null || $pic->site_id === $unit->site_id);

                if (! $validPic) {
                    $v->errors()->add('pic_approver_id', 'PIC harus memiliki role driver, jenjang yang sesuai, serta site dan departemen yang sama dengan unit.');
                }
            }
        });
    }

    public function requiresPicApprover(): bool
    {
        $unit = Unit::find($this->input('unit_id'));
        if ($unit?->jenis_unit !== 'Light Vehicle') {
            return false;
        }

        // Staff/Sr.Staff tidak perlu PIC — mereka sendiri bertindak sebagai approver
        return $this->user()?->needsLvApproval() ?? true;
    }

    /** Jabatan PIC yang diizinkan berdasarkan jabatan submitter (hierarki approval). */
    public function getRequiredPicJabatan(): string
    {
        $map = ['Non Staff' => 'Staff', 'Staff' => 'Sr.Staff'];

        return $map[$this->user()?->jabatan] ?? 'Staff';
    }

    /** Department dari unit yang dipilih — dipakai untuk validasi PIC harus sedepartemen. */
    public function getPicDepartment(): ?string
    {
        $unit = Unit::find($this->input('unit_id'));

        return $unit?->department;
    }

    public function isOverrideDecision(): bool
    {
        $kondisiAkhir = $this->input('kondisi_akhir');
        if (! $kondisiAkhir) {
            return false;
        }

        $answers = $this->input('answers', []);
        $total = count($answers);
        if ($total === 0) {
            return false;
        }

        $answerCollection = collect($answers);
        $tidakLayakIds = $answerCollection->where('kondisi', 'Tidak Layak')->pluck('inspection_item_id');

        $hasAACritical = P2hInspectionItem::whereIn('id', $tidakLayakIds)
            ->where('kode_bahaya', 'AA')
            ->exists();

        $layak = $answerCollection->where('kondisi', 'Layak')->count();
        $score = ($layak / $total) * 100;
        $recommended = ($hasAACritical || $score < 80) ? 'BD' : 'Layak Pakai';

        return $kondisiAkhir !== $recommended;
    }
}
