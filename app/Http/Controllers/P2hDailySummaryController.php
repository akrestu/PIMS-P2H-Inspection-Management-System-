<?php

namespace App\Http\Controllers;

use App\Ai\Agents\P2hActionPlanAgent;
use App\Ai\Agents\P2hDailySummaryAgent;
use App\Models\Site;
use App\Models\Unit;
use App\Support\AiText;
use App\Support\DailyP2hDigest;
use App\Support\P2hDigestFormatter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class P2hDailySummaryController extends Controller
{
    public function index(Request $request): Response
    {
        [$start, $end, $siteId, $jenisUnit] = $this->filters($request);
        $digest = DailyP2hDigest::build($start, $end, $siteId, $jenisUnit);

        return Inertia::render('p2h/daily-summary', [
            'digest' => $digest,
            'template' => P2hDigestFormatter::toWhatsApp($digest),
            'filters' => ['start' => $start->toDateString(), 'end' => $end->toDateString(), 'site_id' => $siteId, 'jenis_unit' => $jenisUnit],
            'jenisOptions' => Unit::distinct()->orderBy('jenis_unit')->pluck('jenis_unit'),
            'sites' => Site::where('status', 'active')->orderBy('name')->get(['id', 'name']),
            'aiEnabled' => AiText::enabled(),
        ]);
    }

    public function generateAi(Request $request): JsonResponse
    {
        [$start, $end, $siteId, $jenisUnit] = $this->filters($request);
        $digest = DailyP2hDigest::build($start, $end, $siteId, $jenisUnit);

        $template = P2hDigestFormatter::toWhatsApp($digest);

        // AI hanya merapikan bahasa template; susunan laporan tetap dari template
        $text = AiText::generate(new P2hDailySummaryAgent, $template);

        // Hasil yang mengubah susunan baris dianggap tidak valid → pakai template
        if ($text !== null && substr_count(trim($text), "\n") !== substr_count($template, "\n")) {
            $text = null;
        }

        // AI menyusun arahan CORRECTIVE ACTION dari fakta; arahan tak valid → arahan template
        $facts = P2hDigestFormatter::actionFacts($digest);
        if ($facts !== '' && str_contains($template, '*CORRECTIVE ACTION*')
            && ($actions = self::validActions(AiText::generate(new P2hActionPlanAgent, $facts), $facts)) !== null) {
            $text = P2hDigestFormatter::replaceActions($text ?? $template, $actions);
        }

        return self::aiResponse($text, $template);
    }

    /**
     * Arahan AI hanya dipakai bila berupa 1–6 baris "- ..." dan setiap angka
     * (jumlah, nomor unit, lama BD) memang ada di fakta.
     *
     * @return list<string>|null
     */
    private static function validActions(?string $text, string $facts): ?array
    {
        if ($text === null) {
            return null;
        }

        $lines = array_values(array_filter(array_map('trim', explode("\n", $text)), fn ($l) => $l !== ''));
        if ($lines === [] || count($lines) > 6) {
            return null;
        }

        preg_match_all('/\d+/', $facts, $known);
        foreach ($lines as $line) {
            preg_match_all('/\d+/', $line, $numbers);
            if (! str_starts_with($line, '- ') || array_diff($numbers[0], $known[0]) !== []) {
                return null;
            }
        }

        return $lines;
    }

    /** Respons standar tombol "Rapikan dengan AI": hasil AI, atau template bila AI tidak tersedia. */
    public static function aiResponse(?string $text, string $template): JsonResponse
    {
        if ($text !== null) {
            return response()->json(['text' => $text, 'fallback' => false]);
        }

        return response()->json([
            'text' => $template,
            'fallback' => true,
            'message' => AiText::enabled()
                ? 'AI sedang tidak tersedia. Menampilkan template.'
                : 'AI belum dikonfigurasi (GEMINI_API_KEY kosong). Menampilkan template.',
        ]);
    }

    /**
     * Rentang tanggal laporan (default: hari ini saja). Dibatasi 31 hari agar
     * teks WhatsApp tetap wajar; evaluasi lebih panjang pakai Periodic Report.
     *
     * @return array{0: Carbon, 1: Carbon, 2: ?int, 3: ?string}
     */
    private function filters(Request $request): array
    {
        $validated = $request->validate([
            'start' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'],
            'end' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:start', 'before_or_equal:today'],
            'site_id' => ['nullable', 'integer', 'exists:sites,id'],
            'jenis_unit' => ['nullable', 'string', 'max:50'],
        ]);

        $start = isset($validated['start']) ? Carbon::parse($validated['start']) : today();
        $end = isset($validated['end']) ? Carbon::parse($validated['end']) : $start->copy();

        if ($start->diffInDays($end) > 30) {
            throw ValidationException::withMessages(['end' => 'Rentang Daily Report maksimal 31 hari. Gunakan Periodic Report untuk periode lebih panjang.']);
        }

        return [
            $start,
            $end,
            isset($validated['site_id']) ? (int) $validated['site_id'] : null,
            $validated['jenis_unit'] ?? null,
        ];
    }
}
