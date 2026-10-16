# PIMS — paket serah terima desain

**PIMS (P2H Management System)**: PWA untuk pemeriksaan harian (P2H) unit & alat berat tambang. Driver mengisi P2H di HP (bisa offline); Manager menyetujui, memantau kepatuhan, temuan, dan ketersediaan armada; Admin mengelola data & pengaturan.

## Cara pakai paket ini
1. Ekstrak ke root repo (atau folder `design-handoff/` di dalam repo).
2. Buka repo di VS Code dengan Claude Code. `CLAUDE.md` otomatis dibaca — berisi aturan, stack, dan urutan kerja.
3. Minta Claude Code mulai dari **Fase 0** di `docs/12-implementation-plan.md`, satu fase per sesi/PR.
4. Lihat tampilan target di `design/screens/` (42 tangkapan layar: mobile 390 & desktop 1440).

## Isi
| Folder | Isi |
|---|---|
| `CLAUDE.md` | instruksi untuk Claude Code |
| `docs/` | 13 dokumen spesifikasi + `docs/screens/` per modul |
| `design/tokens.css` | token Tailwind v4 + shadcn (light, dark, kontras tinggi) |
| `design/screens/` | PNG semua layar |
| `design/prototypes/` | prototype interaktif `.dc.html` (referensi perilaku; butuh runtime kanvas desain untuk dijalankan, baca kodenya saja) |
| `design/assets/` | logo PIMS, foto contoh, motif topo |
| `data/` | data contoh JSON untuk seeder |

## Stack target
Laravel 12 · Inertia 2 · React 19 + TypeScript · Tailwind CSS v4 · shadcn/ui (Radix, vaul, sonner) · Recharts · lucide-react · motion · PWA (Workbox) · font Geist.

Kanvas desain interaktif (semua layar, bisa diklik) tetap tersedia di artifact PIMS di claude.ai.
