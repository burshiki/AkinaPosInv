<?php

namespace App\Http\Requests;

use App\Models\Warranty;
use Illuminate\Foundation\Http\FormRequest;

class BatchRecordSerialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'serials'                 => ['required', 'array', 'min:1'],
            'serials.*.warranty_id'   => ['required', 'integer', 'exists:warranties,id'],
            'serials.*.serial_number' => ['nullable', 'string', 'max:255'],
            'serials.*.notes'         => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($v) {
            $serials = collect($this->input('serials', []))
                ->pluck('serial_number')
                ->filter()
                ->map(fn ($s) => strtolower(trim($s)));

            // Within-batch duplicates
            $dupes = $serials->duplicates()->unique()->values();
            if ($dupes->isNotEmpty()) {
                $v->errors()->add('serials', 'Duplicate serial numbers in batch: ' . $dupes->implode(', '));
            }

            // Against existing DB records (exclude the warranties being updated)
            $ids = collect($this->input('serials', []))->pluck('warranty_id');

            Warranty::whereIn('serial_number', $serials->all())
                ->whereNotIn('id', $ids)
                ->pluck('serial_number')
                ->each(fn ($s) => $v->errors()->add('serials', "Serial '{$s}' is already registered in the system."));
        });
    }
}
