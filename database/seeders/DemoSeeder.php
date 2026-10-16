<?php

namespace Database\Seeders;

use App\Models\P2hChecklistAnswer;
use App\Models\P2hInspectionItem;
use App\Models\P2hSession;
use App\Models\P2hUserEntry;
use App\Models\Site;
use App\Models\Unit;
use App\Models\UnitDowntimeLog;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Activitylog\Models\Activity;

/**
 * Data contoh untuk pengembangan & cek visual terhadap mockup (pims-redesign/).
 * Jalankan: php artisan db:seed --class=DemoSeeder (setelah DatabaseSeeder).
 * Jangan dijalankan di produksi.
 */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->isProduction()) {
            return;
        }

        mt_srand(1045);

        $site = Site::firstOrCreate(['name' => 'Pit A'], ['status' => 'active']);
        Site::firstOrCreate(['name' => 'Pit B'], ['status' => 'active']);

        $manager = $this->user('Hendra Wijaya', '19870312', 'manager', User::JABATAN_APPROVAL, $site, 'hendra.w@kontraktor.co.id');
        $this->user('Rina Anggraini', '19850704', 'admin', User::JABATAN_USER_LV1, $site, 'rina.a@kontraktor.co.id');

        $driverNames = [
            ['Budi Santoso', '20231045'], ['Andi Pratama', '20220118'], ['Sari Maharani', '20230512'],
            ['Joko Widodo', '20210931'], ['Dedi Kurniawan', '20200407'], ['Rudi Hartono', '20190822'],
            ['Hendro Purnomo', '20221103'], ['Agus Salim', '20230227'], ['Fajar Nugroho', '20240106'],
            ['Slamet Riyadi', '20180715'],
        ];
        $drivers = collect($driverNames)->map(fn ($d) => $this->user($d[0], $d[1], 'driver', User::JABATAN_USER_LV1, $site));

        $units = collect();
        foreach (range(1, 14) as $i) {
            $isBus = $i > 10;
            $code = $isBus ? sprintf('BUS-%02d', $i) : sprintf('LV-%03d', 30 + $i);
            $units->push(Unit::firstOrCreate(['no_unit' => $code], [
                'jenis_unit' => $isBus ? 'Bus' : 'Light Vehicle',
                'no_lambung' => 'KT '.(8000 + $i * 37).' WB',
                'status' => 'active',
                'department' => 'Operasional',
                'site_id' => $site->id,
            ]));
        }

        // Unit sudah terdaftar sejak lama agar PA & kepatuhan historis terhitung
        Unit::whereIn('id', $units->pluck('id'))->update(['created_at' => now()->subDays(60)]);

        // Budi ditugaskan ke unit pertama (kartu "Unit hari ini").
        $drivers[0]->units()->syncWithoutDetaching([$units[0]->id]);
        // Bus yang belum P2H hari ini punya driver tetap → bisa di-"Ingatkan";
        // LV-040 sengaja tanpa driver ditugaskan (tombol nonaktif).
        $drivers[9]->units()->syncWithoutDetaching([$units[10]->id]);
        $drivers[8]->units()->syncWithoutDetaching([$units[11]->id]);

        $items = P2hInspectionItem::active()->ordered()->get();
        $today = Carbon::today();

        // 30 hari riwayat; hari ini sebagian unit belum P2H.
        foreach (range(29, 0) as $daysAgo) {
            $date = $today->copy()->subDays($daysAgo);

            foreach ($units as $idx => $unit) {
                if ($daysAgo === 0 && $idx >= 9) {
                    continue; // Belum P2H hari ini
                }
                if ($daysAgo > 0 && mt_rand(1, 100) <= 8) {
                    continue; // Sesekali tidak P2H
                }

                $driver = $drivers[$idx % $drivers->count()];
                $submittedAt = $date->copy()->setTime(5, 30)->addMinutes(mt_rand(0, 45));
                $broken = mt_rand(1, 100) <= ($daysAgo === 0 ? 20 : 10);
                $brokenItem = $broken ? $items->random() : null;
                $critical = $brokenItem?->kode_bahaya === 'AA';

                $session = P2hSession::create([
                    'unit_id' => $unit->id,
                    'tanggal' => $date->toDateString(),
                    'job_site' => $site->name,
                    'status' => 'completed',
                    'created_by' => $driver->id,
                ]);

                $pending = $daysAgo === 0 && in_array($idx, [2, 4, 7], true);

                $entry = P2hUserEntry::create([
                    'p2h_session_id' => $session->id,
                    'user_id' => $driver->id,
                    'user_slot' => 1,
                    'lokasi_kerja' => $site->name,
                    'km_awal' => 12000 + $idx * 731 + (30 - $daysAgo) * 85,
                    'shift' => 'Shift I',
                    'submitted_at' => $submittedAt,
                    'kondisi_akhir' => $critical ? 'BD' : 'Layak Pakai',
                    'justifikasi_kondisi' => $critical ? 'Item kritis rusak' : null,
                    'approval_status' => $pending ? 'pending' : 'approved',
                    'pic_approver_id' => $manager->id,
                    'approver_id' => $pending ? null : $manager->id,
                    'approved_at' => $pending ? null : $submittedAt->copy()->addMinutes(mt_rand(5, 40)),
                    'escalated_at' => $pending && $idx === 4 ? $submittedAt->copy()->addMinutes(15) : null,
                ]);

                foreach ($items as $item) {
                    $isBroken = $brokenItem && $item->id === $brokenItem->id;
                    P2hChecklistAnswer::create([
                        'p2h_user_entry_id' => $entry->id,
                        'inspection_item_id' => $item->id,
                        'kondisi' => $isBroken ? 'Tidak Layak' : 'Layak',
                        'keterangan' => $isBroken ? 'Perlu perbaikan segera' : null,
                        'item_nama' => $item->nama_item,
                        'item_section' => $item->section,
                        'item_kode_bahaya' => $item->kode_bahaya,
                        'item_urutan' => $item->urutan,
                    ]);
                }
            }
        }

        $this->notifications($manager);
        $this->auditLogs($manager, $units);

        // Satu unit sedang PM, satu servis (manual).
        UnitDowntimeLog::firstOrCreate(
            ['unit_id' => $units[12]->id, 'tipe' => 'PM'],
            ['jam_mulai' => $today->copy()->setTime(4, 10), 'keterangan' => 'PM 500 jam', 'created_by' => $manager->id],
        );
        UnitDowntimeLog::firstOrCreate(
            ['unit_id' => $units[13]->id, 'tipe' => 'Servis Berkala'],
            ['jam_mulai' => $today->copy()->subDay()->setTime(14, 20), 'keterangan' => 'Ganti ban', 'created_by' => $manager->id],
        );
    }

    /** Contoh notifikasi untuk halaman Notifikasi (payload sama dengan kelas di app/Notifications). */
    private function notifications(User $manager): void
    {
        if ($manager->notifications()->exists()) {
            return;
        }

        $samples = [
            [25, null, ['type' => 'lv_approval_escalation', 'no_unit' => 'LV-035', 'submitter' => 'Dedi Kurniawan', 'pic_name' => 'Hendra Wijaya', 'shift' => 'Shift I']],
            [50, null, ['type' => 'critical_alert', 'no_unit' => 'LV-037', 'driver_name' => 'Hendro Purnomo', 'critical_items' => [['nama_item' => 'Fungsi Brake', 'keterangan' => 'Rem kurang pakem']]]],
            [70, null, ['type' => 'lv_approval_request', 'no_unit' => 'LV-033', 'submitter' => 'Sari Maharani', 'shift' => 'Shift I', 'tanggal' => today()->format('d/m/Y')]],
            [90, null, ['type' => 'finding_overdue', 'no_unit' => 'LV-032', 'item_nama' => 'Lampu Rotary (Strobe lamp)', 'pic_name' => 'Hendra Wijaya', 'hari_terlambat' => 1]],
            [120, now()->subMinutes(100), ['type' => 'finding_assigned', 'no_unit' => 'BUS-12', 'item_nama' => 'Fungsi Brake', 'assigned_by' => 'Rina Anggraini', 'target_selesai' => today()->addDay()->toDateString()]],
            [150, null, ['type' => 'p2h_missing', 'no_unit' => 'BUS-11, BUS-12, LV-040', 'jumlah' => 3, 'tanggal' => today()->toDateString()]],
            [200, now()->subMinutes(180), ['type' => 'lv_approval_result', 'no_unit' => 'LV-031', 'status' => 'approved', 'approver' => 'Hendra Wijaya']],
        ];

        foreach ($samples as [$minutesAgo, $readAt, $data]) {
            $manager->notifications()->create([
                'id' => (string) Str::uuid(),
                'type' => 'App\\Notifications\\Demo',
                'data' => $data,
                'read_at' => $readAt,
                'created_at' => now()->subMinutes($minutesAgo),
                'updated_at' => now()->subMinutes($minutesAgo),
            ]);
        }
    }

    /** Contoh entri Audit log (format sama dengan activity() di controller). */
    private function auditLogs(User $manager, $units): void
    {
        if (Activity::exists()) {
            return;
        }

        $admin = User::where('nik', '19850704')->first();
        $samples = [
            [20, $manager, 'p2h', "Menyetujui P2H {$units[0]->no_unit}", ['catatan' => null]],
            [55, $admin, 'unit', "Mengubah status unit {$units[12]->no_unit} menjadi PM", ['attributes' => ['status' => 'PM'], 'old' => ['status' => 'Ready']]],
            [90, null, 'p2h', "Menandai BD otomatis dari P2H tidak layak {$units[6]->no_unit}", []],
            [180, $admin, 'unit', 'Menambahkan unit: LV-041 (Light Vehicle)', ['no_unit' => 'LV-041']],
            [600, $admin, 'user', 'Memperbarui user: Budi Santoso', ['attributes' => ['site_id' => 1], 'old' => ['site_id' => null]]],
            [1500, $manager, 'p2h', 'Menutup temuan T-0009', []],
            [2900, $admin, 'unit', 'Menghapus unit: LV-099', ['no_unit' => 'LV-099', 'jenis_unit' => 'Light Vehicle']],
        ];

        foreach ($samples as [$minutesAgo, $causer, $log, $description, $props]) {
            $activity = activity($log)->withProperties($props);
            if ($causer) {
                $activity->causedBy($causer);
            }
            $activity->createdAt(now()->subMinutes($minutesAgo))->log($description);
        }
    }

    private function user(string $name, string $nik, string $role, string $jabatan, Site $site, ?string $email = null): User
    {
        $user = User::updateOrCreate(['nik' => $nik], [
            'name' => $name,
            'email' => $email,
            'password' => Hash::make('password'),
            'jabatan' => $jabatan,
            'department' => 'Operasional',
            'site_id' => $site->id,
        ]);
        $user->syncRoles([$role]);

        return $user;
    }
}
