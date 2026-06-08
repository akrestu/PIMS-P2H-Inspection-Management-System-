<?php

namespace Database\Seeders;

use App\Models\P2hInspectionItem;
use Illuminate\Database\Seeder;

class InspectionItemSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            // Seksi A — Pemeriksaan Keliling Unit / Di Luar Kabin
            ['urutan' => 1,  'section' => 'A', 'kode_bahaya' => 'AA', 'nama_item' => 'Ban & baut roda'],
            ['urutan' => 2,  'section' => 'A', 'kode_bahaya' => 'AA', 'nama_item' => 'Lampu Rotary (Strobe lamp)'],
            ['urutan' => 3,  'section' => 'A', 'kode_bahaya' => 'A',  'nama_item' => 'Level Oli Engine'],
            ['urutan' => 4,  'section' => 'A', 'kode_bahaya' => 'A',  'nama_item' => 'Level Air Radiator'],
            ['urutan' => 5,  'section' => 'A', 'kode_bahaya' => 'A',  'nama_item' => 'Level Oli Steering'],
            ['urutan' => 6,  'section' => 'A', 'kode_bahaya' => 'A',  'nama_item' => 'Level Oli Rem (Break Oil)'],
            ['urutan' => 7,  'section' => 'A', 'kode_bahaya' => 'A',  'nama_item' => 'Buggy Whip'],
            ['urutan' => 8,  'section' => 'A', 'kode_bahaya' => 'A',  'nama_item' => 'Alarm Mundur'],
            ['urutan' => 9,  'section' => 'A', 'kode_bahaya' => 'A',  'nama_item' => 'Kondisi battery/accu'],
            ['urutan' => 10, 'section' => 'A', 'kode_bahaya' => 'A',  'nama_item' => 'Air Wipper'],
            ['urutan' => 11, 'section' => 'A', 'kode_bahaya' => 'A',  'nama_item' => 'Kebersihan Alat*'],

            // Seksi B — Pemeriksaan Dari Dalam Kabin
            ['urutan' => 12, 'section' => 'B', 'kode_bahaya' => 'AA', 'nama_item' => 'Fungsi Brake'],
            ['urutan' => 13, 'section' => 'B', 'kode_bahaya' => 'AA', 'nama_item' => 'Fungsi Parking Brake'],
            ['urutan' => 14, 'section' => 'B', 'kode_bahaya' => 'AA', 'nama_item' => 'Fungsi Steering/Reaksi Kemudi'],
            ['urutan' => 15, 'section' => 'B', 'kode_bahaya' => 'AA', 'nama_item' => 'Fungsi Lampu Kerja'],
            ['urutan' => 16, 'section' => 'B', 'kode_bahaya' => 'AA', 'nama_item' => 'Fungsi Seat belt/Sabuk pengaman (driver dan penumpang)'],
            ['urutan' => 17, 'section' => 'B', 'kode_bahaya' => 'AA', 'nama_item' => 'Kondisi Spion'],
            ['urutan' => 18, 'section' => 'B', 'kode_bahaya' => 'AA', 'nama_item' => 'Klakson'],
            ['urutan' => 19, 'section' => 'B', 'kode_bahaya' => 'A',  'nama_item' => 'Fungsi Double Gardan (4WD)'],
            ['urutan' => 20, 'section' => 'B', 'kode_bahaya' => 'A',  'nama_item' => 'Fungsi Lampu Mundur'],
            ['urutan' => 21, 'section' => 'B', 'kode_bahaya' => 'A',  'nama_item' => 'Fungsi Lampu Sein & Hazard'],
            ['urutan' => 22, 'section' => 'B', 'kode_bahaya' => 'A',  'nama_item' => 'Fungsi Lampu Rem'],
            ['urutan' => 23, 'section' => 'B', 'kode_bahaya' => 'A',  'nama_item' => 'Wipper'],
            ['urutan' => 24, 'section' => 'B', 'kode_bahaya' => 'A',  'nama_item' => 'APAR*'],
            ['urutan' => 25, 'section' => 'B', 'kode_bahaya' => 'A',  'nama_item' => 'Kotak PPGD (P3K)*'],
            ['urutan' => 26, 'section' => 'B', 'kode_bahaya' => 'A',  'nama_item' => 'Control Panel'],
            ['urutan' => 27, 'section' => 'B', 'kode_bahaya' => 'A',  'nama_item' => 'Radio'],
            ['urutan' => 28, 'section' => 'B', 'kode_bahaya' => 'A',  'nama_item' => 'Kebersihan Ruang Kabin*'],

            // Seksi C — Kelengkapan Tambahan
            ['urutan' => 29, 'section' => 'C', 'kode_bahaya' => 'A',  'nama_item' => 'Traffic cone (safety cone)*'],
            ['urutan' => 30, 'section' => 'C', 'kode_bahaya' => 'A',  'nama_item' => 'Wheel chock (ganjal roda)*'],
        ];

        foreach ($items as $item) {
            P2hInspectionItem::updateOrCreate(
                ['section' => $item['section'], 'urutan' => $item['urutan']],
                array_merge($item, ['is_active' => true])
            );
        }
    }
}
