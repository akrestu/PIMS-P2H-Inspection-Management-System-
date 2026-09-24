<?php

namespace App\Http\Controllers;

use App\Ai\Agents\P2hDailySummaryAgent;
use App\Models\Site;
use App\Models\Unit;
use App\Support\AiText;
use App\Support\DailyP2hDigest;
use App\Support\P2hDigestFormatter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class P2hDailySummaryController extends Controller
{
    public function index(Request $request): Response
    {
        [$date, $siteId, $jenisUnit] = $this->filters($request);
        $digest = DailyP2hDigest::build($date, $siteId, $jenisUnit);

        return Inertia::render('p2h/daily-summary', [
            'digest' => $digest,
            'template' => P2hDigestFormatter::toWhatsApp($digest),
            'filters' => ['date' => $date->toDateString(), 'site_id' => $siteId, 'jenis_unit' => $jenisUnit],
            'jenisOptions' => Unit::distinct()->orderBy('jenis_unit')->pluck('jenis_unit'),
            'sites' => Site::where('status', 'active')->orderBy('name')->get(['id', 'name']),
            'aiEnabled' => AiText::enabled(),
        ]);
    }

    public function generateAi(Request $request): JsonResponse
    {
        [$date, $siteId, $jenisUnit] = $this->filters($request);
        $digest = DailyP2hDigest::build($date, $siteId, $jenisUnit);

        // Laporan tidak memuat ringkasan statistik, jadi stats tidak dikirim ke AI
        $payload = json_encode(collect($digest)->except('stats')->all(), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        $text = AiText::generate(new P2hDailySummaryAgent, "Susun Daily Report P2H dari data berikut:\n".$payload);

        return self::aiResponse($text, P2hDigestFormatter::toWhatsApp($digest));
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

    /** @return array{0: Carbon, 1: ?int, 2: ?string} */
    private function filters(Request $request): array
    {
        $validated = $request->validate([
            'date' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'],
            'site_id' => ['nullable', 'integer', 'exists:sites,id'],
            'jenis_unit' => ['nullable', 'string', 'max:50'],
        ]);

        return [
            isset($validated['date']) ? Carbon::parse($validated['date']) : today(),
            isset($validated['site_id']) ? (int) $validated['site_id'] : null,
            $validated['jenis_unit'] ?? null,
        ];
    }
}
