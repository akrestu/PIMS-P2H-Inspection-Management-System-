<?php

namespace Database\Seeders;

use App\Models\P2hInspectionItem;
use Illuminate\Database\Seeder;

class InspectionItemSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            ['urutan' => 1,  'nama_item' => 'Kondisi Steering / Kemudi',          'risiko' => 'Critical'],
            ['urutan' => 2,  'nama_item' => 'Tyre / Ban',                          'risiko' => 'Tinggi'],
            ['urutan' => 3,  'nama_item' => 'Ban Cadangan',                        'risiko' => 'Sedang'],
            ['urutan' => 4,  'nama_item' => 'Tekanan Ban',                         'risiko' => 'Sedang'],
            ['urutan' => 5,  'nama_item' => 'Jumlah & Kekencangan Baut Roda',      'risiko' => 'Tinggi'],
            ['urutan' => 6,  'nama_item' => 'Kaca depan/samping/belakang',         'risiko' => 'Sedang'],
            ['urutan' => 7,  'nama_item' => 'Kaca Spion',                          'risiko' => 'Sedang'],
            ['urutan' => 8,  'nama_item' => 'Lampu Atas/depan/Belakang',           'risiko' => 'Sedang'],
            ['urutan' => 9,  'nama_item' => 'Lampu Bahaya',                        'risiko' => 'Sedang'],
            ['urutan' => 10, 'nama_item' => 'Lampu Sign Kanan/kiri',               'risiko' => 'Sedang'],
            ['urutan' => 11, 'nama_item' => 'Alarm Mundur',                        'risiko' => 'Sedang'],
            ['urutan' => 12, 'nama_item' => 'Speedometer',                         'risiko' => 'Rendah'],
            ['urutan' => 13, 'nama_item' => 'Level oil mesin',                     'risiko' => 'Sedang'],
            ['urutan' => 14, 'nama_item' => 'Level oil brake / rem',               'risiko' => 'Critical'],
            ['urutan' => 15, 'nama_item' => 'Level air radiator',                  'risiko' => 'Sedang'],
            ['urutan' => 16, 'nama_item' => 'Level air accu',                      'risiko' => 'Sedang'],
            ['urutan' => 17, 'nama_item' => 'Tuas / Handle transmisi',             'risiko' => 'Sedang'],
            ['urutan' => 18, 'nama_item' => 'Rem tangan / kaki',                   'risiko' => 'Critical'],
            ['urutan' => 19, 'nama_item' => 'Washer / air wiper',                  'risiko' => 'Sedang'],
            ['urutan' => 20, 'nama_item' => 'Klakson',                             'risiko' => 'Sedang'],
            ['urutan' => 21, 'nama_item' => 'Sabuk pengaman depan/kabin',          'risiko' => 'Critical'],
            ['urutan' => 22, 'nama_item' => 'Tanda Bahaya segitiga',               'risiko' => 'Rendah'],
            ['urutan' => 23, 'nama_item' => 'APAR',                                'risiko' => 'Sedang'],
            ['urutan' => 24, 'nama_item' => 'Kunci roda',                          'risiko' => 'Rendah'],
            ['urutan' => 25, 'nama_item' => 'Jack / Dongkrak',                     'risiko' => 'Sedang'],
            ['urutan' => 26, 'nama_item' => 'Rotary / Flash Light',                'risiko' => 'Sedang'],
            ['urutan' => 27, 'nama_item' => 'No lambung unit',                     'risiko' => 'Rendah'],
            ['urutan' => 28, 'nama_item' => 'Radio Komunikasi',                    'risiko' => 'Sedang'],
            ['urutan' => 29, 'nama_item' => 'Buggy Whip / Bendera (min 4 mtr)',    'risiko' => 'Sedang'],
            ['urutan' => 30, 'nama_item' => 'Four wheel Drive (Double Gardan)',     'risiko' => 'Sedang'],
        ];

        foreach ($items as $item) {
            P2hInspectionItem::create(array_merge($item, ['is_active' => true]));
        }
    }
}
