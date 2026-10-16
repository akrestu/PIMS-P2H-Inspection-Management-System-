import { Head, Link, usePage } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    Check,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ClipboardList,
    Droplets,
    Fuel,
    Gauge,
    ImagePlus,
    Info,
    Loader2,
    Lock,
    MapPin,
    PenLine,
    Plus,
    Search,
    Send,
    ShieldAlert,
    ShieldCheck,
    Sun,
    Truck,
    User,
    X,
    Wrench,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type ReactSignatureCanvas from 'react-signature-canvas';
import { toast } from 'sonner';
import ChecklistGroup from '@/components/P2h/ChecklistGroup';
import SignaturePad from '@/components/P2h/SignaturePad';
import { PhotoPicker } from '@/components/pims/photo-picker';
import { ChecklistProgress } from '@/components/pims/progress';
import { Segmented } from '@/components/pims/segmented';
import { StatusPill } from '@/components/pims/status-pill';
import { useShellNavigation } from '@/components/shell/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { AnswerState, P2hInspectionItem } from '@/types/pims';

/** Unit di daftar pilih Form P2H (P2hSessionController::withPickerInfo). */
type PickerUnit = {
    id: number;
    no_unit: string;
    jenis_unit: string;
    department: string | null;
    site_name: string | null;
    assigned: boolean;
    unit_status: 'ready' | 'bd' | 'pm' | 'servis';
    filled_at: string | null;
    filled_by: string | null;
};

interface StaffUser {
    id: number;
    name: string;
    jabatan: string;
    department: string;
}

interface SiteOption {
    id: number;
    name: string;
}

interface Props {
    units: PickerUnit[];
    inspectionItems: P2hInspectionItem[];
    staffUsers: StaffUser[];
    sites: SiteOption[];
}

interface SlotInfo {
    session_id: number | null;
    slot_terisi: number;
    slot_tersedia: boolean;
    next_slot: number;
    last_hm_km_akhir: number | null;
}

const SECTION_ORDER: P2hInspectionItem['section'][] = ['A', 'B', 'C'];

const LOKASI_OPTIONS = [
    'Tambang / Pit',
    'Jalan Hauling OB',
    'Jalan Hauling COAL',
    'Disposal',
    'Sump',
    'Area Parkir',
    'Pit Stop / Area Refueling',
    'Workshop',
    'Warehouse',
    'Laydown B3',
    'TPS Limbah B3',
    'Office',
    'Stock Room',
    'Crusher Stock Pile',
    'Mess',
    'Katering',
    'Jalan Warga / Raya',
    'Area Vendor',
    'Water Fill',
    'Washing Pad',
    'Area Pembagian Nasi',
    'Unit/Peralatan',
    'Sarana',
    'Area Diversi Sungai Kungkilan',
    'Area Akses Senapo',
    'Container Produksi',
    'Container HSE &/ GA',
];

function toProperCase(str: string): string {
    return str.replace(
        /\w\S*/g,
        (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
    );
}

async function compressImage(
    file: File,
    maxWidth = 1280,
    quality = 0.75,
): Promise<File> {
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const scale = Math.min(1, maxWidth / img.width);
            const canvas = document.createElement('canvas');
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        resolve(file);

                        return;
                    }

                    resolve(
                        new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
                            type: 'image/jpeg',
                        }),
                    );
                },
                'image/jpeg',
                quality,
            );
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(file);
        };
        img.src = url;
    });
}

const STEPS = [
    { id: 1, label: 'Unit & Shift', title: 'Pilih unit & shift', icon: Wrench },
    { id: 2, label: 'Pemeriksaan', title: 'Checklist pemeriksaan', icon: ClipboardList },
    { id: 3, label: 'Servis & BBM', title: 'Servis & BBM', icon: Droplets },
    { id: 4, label: 'Konfirmasi', title: 'Tinjau & tanda tangan', icon: PenLine },
] as const;

/** Langkah form tempat field dari error validasi server berada. */
function stepForErrorKey(key: string): number {
    if (key.startsWith('answers') || key.startsWith('item_attachments')) {
        return 2;
    }

    if (key.startsWith('service_info') || key.startsWith('fuel_log')) {
        return 3;
    }

    if (
        [
            'kondisi_akhir',
            'justifikasi_kondisi',
            'hm_km_akhir',
            'paraf',
            'attachments',
        ].some((k) => key.startsWith(k))
    ) {
        return 4;
    }

    // unit_id, pic_approver_id, job_site, lokasi_kerja, km_awal, shift
    return 1;
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
// ChecklistProgress (docs/02): "Langkah n dari 4" + bar + "12/18 item" di langkah pemeriksaan
function StepIndicator({
    current,
    done,
    total,
}: {
    current: number;
    done?: number;
    total?: number;
}) {
    return (
        <ChecklistProgress
            step={current}
            totalSteps={STEPS.length}
            done={done}
            total={total}
            label={STEPS[current - 1].label}
        />
    );
}

// ─── Layar sukses ─────────────────────────────────────────────────────────────
// Lingkaran pop + centang digambar (stroke-dashoffset); gerak mati bila "Kurangi gerakan".
function SubmitSuccess({
    unit,
    layak,
    pic,
    homeHref,
}: {
    unit: string;
    layak: boolean;
    pic: string | null;
    homeHref: string;
}) {
    return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 py-10 text-center">
            <div
                className={cn(
                    'grid size-28 animate-pop place-items-center rounded-full',
                    layak
                        ? 'bg-success-soft text-success'
                        : 'bg-danger-soft text-danger',
                )}
            >
                <svg viewBox="0 0 52 52" className="size-16" aria-hidden>
                    <path
                        d={
                            layak
                                ? 'M14 27 L23 36 L39 18'
                                : 'M17 17 L35 35 M35 17 L17 35'
                        }
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="[stroke-dasharray:60] [stroke-dashoffset:60] motion-safe:animate-[pims-draw_500ms_var(--ease-out)_250ms_forwards] motion-reduce:[stroke-dashoffset:0]"
                    />
                </svg>
            </div>
            <div className="space-y-2" role="status">
                <h1 className="text-2xl font-semibold tracking-[-0.02em]">
                    P2H terkirim · {layak ? 'Layak Pakai' : 'Tidak Layak'}
                </h1>
                <p className="text-[15px] text-muted-foreground">
                    {layak
                        ? `${unit} siap dioperasikan.`
                        : `${unit} tercatat BD. Pengawas sudah diberi tahu.`}
                </p>
                {pic && (
                    <p className="text-[15px] text-muted-foreground">
                        Diteruskan ke{' '}
                        <span className="font-semibold text-foreground">
                            {pic}
                        </span>{' '}
                        untuk persetujuan.
                    </p>
                )}
            </div>
            <div className="flex w-full max-w-sm flex-col gap-2">
                <Button asChild size="xl">
                    <Link href={homeHref}>Kembali ke Beranda</Link>
                </Button>
                <Button asChild variant="outline" size="xl">
                    <Link href="/p2h">Lihat riwayat</Link>
                </Button>
            </div>
        </div>
    );
}

// ─── Summary Row ──────────────────────────────────────────────────────────────
function SummaryRow({
    icon: Icon,
    label,
    value,
    highlight,
}: {
    icon?: React.ElementType;
    label: string;
    value: string;
    highlight?: boolean;
}) {
    return (
        <div className="flex items-center gap-3 py-2">
            {Icon && (
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="min-w-0 flex-1 text-base text-muted-foreground">
                {label}
            </span>
            <span
                className={cn(
                    'text-base font-semibold',
                    highlight && 'text-destructive',
                )}
            >
                {value}
            </span>
        </div>
    );
}

// ─── Step Nav Footer ──────────────────────────────────────────────────────────
interface StepNavFooterProps {
    step: number;
    totalSteps: number;
    steps: typeof STEPS;
    onNext: () => void;
    onPrev: () => void;
    onSubmit: () => void;
    submitting: boolean;
    uploadPct?: number | null;
    submitDisabled: boolean;
}

function StepNavFooter({
    step,
    totalSteps,
    steps,
    onNext,
    onPrev,
    onSubmit,
    submitting,
    uploadPct,
    submitDisabled,
}: StepNavFooterProps) {
    const nextStep = steps.find((s) => s.id === step + 1);
    const isLastStep = step === totalSteps;

    return (
        <div className="sticky bottom-0 z-40 mt-auto border-t px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] blurbar">
            <div className="mx-auto flex max-w-[640px] items-center gap-2.5">
                {step > 1 && (
                    <Button
                        type="button"
                        variant="outline"
                        size="xl"
                        onClick={onPrev}
                        className="min-w-0 flex-1"
                    >
                        <ChevronLeft />
                        Kembali
                    </Button>
                )}
                {isLastStep ? (
                    <Button
                        type="button"
                        variant="brand"
                        size="xl"
                        onClick={onSubmit}
                        disabled={submitDisabled && !submitting}
                        loading={submitting}
                        className="min-w-0 flex-[2]"
                    >
                        {!submitting && <Send />}
                        {submitting
                            ? uploadPct !== null && uploadPct !== undefined
                                ? `Mengunggah ${uploadPct}%`
                                : 'Mengirim…'
                            : 'Kirim P2H'}
                    </Button>
                ) : (
                    <Button
                        type="button"
                        size="xl"
                        onClick={onNext}
                        className="min-w-0 flex-[2]"
                    >
                        Lanjut
                        {nextStep && (
                            <span className="hidden sm:inline">
                                : {nextStep.label}
                            </span>
                        )}
                        <ArrowRight />
                    </Button>
                )}
            </div>
        </div>
    );
}

const DRAFT_KEY = 'p2h_form_draft';

interface P2hDraft {
    step: number;
    selectedUnitId: string;
    jobSite: string;
    lokasiKerja: string;
    kmAwal: string;
    shift: string;
    picApproverId: string;
    answers: Record<number, AnswerState>;
    servisMingguan: boolean;
    servisBerkala: boolean;
    unscheduleBreakdown: boolean;
    lainnya: boolean;
    lainnyaText: string;
    catatanServis: string;
    kmUnit: string;
    jumlahLiter: string;
    hmKmAkhir: string;
    kondisiAkhir: 'Layak Pakai' | 'BD' | '';
    justifikasiKondisi: string;
}

function loadDraft(): Partial<P2hDraft> {
    try {
        const raw = localStorage.getItem(DRAFT_KEY);

        return raw ? (JSON.parse(raw) as Partial<P2hDraft>) : {};
    } catch {
        return {};
    }
}

function saveDraft(draft: P2hDraft) {
    try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
        /* storage full */
    }
}

function clearDraft() {
    try {
        localStorage.removeItem(DRAFT_KEY);
    } catch {
        /* ignore */
    }
}

// ─── PIC Combobox ─────────────────────────────────────────────────────────────
function PicCombobox({
    staffUsers,
    value,
    onChange,
}: {
    staffUsers: StaffUser[];
    value: string;
    onChange: (id: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selected = staffUsers.find((s) => String(s.id) === value) ?? null;

    const filtered = query.trim()
        ? staffUsers.filter(
              (s) =>
                  s.name.toLowerCase().includes(query.toLowerCase()) ||
                  (s.jabatan ?? '')
                      .toLowerCase()
                      .includes(query.toLowerCase()) ||
                  (s.department ?? '')
                      .toLowerCase()
                      .includes(query.toLowerCase()),
          )
        : staffUsers;

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
                setQuery('');
            }
        };
        document.addEventListener('mousedown', handler);

        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const select = (id: string) => {
        onChange(id);
        setOpen(false);
        setQuery('');
    };

    const clear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setQuery('');
    };

    return (
        <div ref={containerRef} className="relative">
            {/* Trigger / input */}
            <div
                className={cn(
                    'flex h-11 w-full cursor-text items-center gap-2 rounded-lg border field px-3 text-sm transition-colors',
                    open
                        ? 'border-primary ring-2 ring-ring'
                        : 'border-input hover:border-muted-foreground/50',
                )}
                onClick={() => {
                    setOpen(true);
                    setTimeout(() => inputRef.current?.focus(), 0);
                }}
            >
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                    ref={inputRef}
                    value={open ? query : ''}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setOpen(true)}
                    placeholder={
                        selected
                            ? selected.name
                            : 'Ketik nama, jabatan, atau departemen…'
                    }
                    className={cn(
                        'flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm',
                        !open && selected
                            ? 'text-transparent placeholder:text-foreground'
                            : '',
                    )}
                />
                {selected && (
                    <button
                        type="button"
                        onClick={clear}
                        className="shrink-0 rounded text-muted-foreground transition-colors hover:text-foreground"
                        aria-label="Hapus pilihan"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
                {!selected && (
                    <ChevronDown
                        className={cn(
                            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                            open && 'rotate-180',
                        )}
                    />
                )}
            </div>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 left-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
                    {filtered.length === 0 ? (
                        <p className="px-4 py-3 text-center text-sm text-muted-foreground">
                            Tidak ada PIC yang cocok.
                        </p>
                    ) : (
                        filtered.map((s) => {
                            const isSelected = String(s.id) === value;

                            return (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => select(String(s.id))}
                                    className={cn(
                                        'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent',
                                        isSelected && 'bg-muted',
                                    )}
                                >
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                        <User className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium">
                                            {s.name}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {s.jabatan}
                                            {s.department
                                                ? ` · ${s.department}`
                                                : ''}
                                        </p>
                                    </div>
                                    {isSelected && (
                                        <Check className="h-4 w-4 shrink-0 text-foreground" />
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Lokasi Combobox ─────────────────────────────────────────────────────────
function LokasiCombobox({
    value,
    onChange,
}: {
    value: string;
    onChange: (v: string) => void;
}) {
    const [sheetOpen, setSheetOpen] = useState(false);
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const filtered = query.trim()
        ? LOKASI_OPTIONS.filter((l) =>
              l.toLowerCase().includes(query.toLowerCase()),
          )
        : LOKASI_OPTIONS;

    const queryProper = query.trim() ? toProperCase(query.trim()) : '';
    const isExactMatch = LOKASI_OPTIONS.some(
        (l) => l.toLowerCase() === query.trim().toLowerCase(),
    );

    const select = (v: string) => {
        onChange(v);
        setSheetOpen(false);
        setQuery('');
    };

    const addManual = () => {
        if (queryProper) {
            onChange(queryProper);
            setSheetOpen(false);
            setQuery('');
        }
    };

    return (
        <>
            <div
                role="button"
                tabIndex={0}
                onClick={() => {
                    setSheetOpen(true);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSheetOpen(true);
                    }
                }}
                className={cn(
                    'flex h-11 w-full cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm transition-colors',
                    value
                        ? 'border-input'
                        : 'border-input text-muted-foreground',
                )}
            >
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">
                    {value || 'Pilih atau ketik lokasi kerja'}
                </span>
                {value && (
                    <button
                        aria-label="Hapus lokasi kerja"
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange('');
                        }}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
                {!value && (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
            </div>

            <Sheet
                open={sheetOpen}
                onOpenChange={(o) => {
                    setSheetOpen(o);

                    if (!o) {
                        setQuery('');
                    }
                }}
            >
                <SheetContent
                    side="bottom"
                    className="flex h-dvh flex-col rounded-none p-0"
                >
                    {/* Header */}
                    <SheetHeader className="shrink-0 px-4 pt-4 pb-0">
                        <SheetTitle>Pilih Lokasi Kerja</SheetTitle>
                    </SheetHeader>

                    {/* Search input — sticky, tidak ikut scroll */}
                    <div className="shrink-0 px-4 py-3">
                        <div className="flex h-11 items-center gap-2 rounded-lg border field px-3">
                            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <input
                                ref={inputRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Cari atau ketik lokasi baru…"
                                className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm"
                            />
                            {query && (
                                <button
                                    aria-label="Hapus teks pencarian"
                                    type="button"
                                    onClick={() => setQuery('')}
                                >
                                    <X className="h-4 w-4 text-muted-foreground" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* List — flex-1 min-h-0 agar bisa scroll dalam flex container */}
                    <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 pb-6">
                        {queryProper && !isExactMatch && (
                            <button
                                type="button"
                                onClick={addManual}
                                className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-input px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
                            >
                                <Plus className="h-4 w-4 shrink-0" />
                                Tambahkan:{' '}
                                <span className="ml-1 font-semibold">
                                    {queryProper}
                                </span>
                            </button>
                        )}
                        {filtered.map((lokasi) => (
                            <button
                                key={lokasi}
                                type="button"
                                onClick={() => select(lokasi)}
                                className={cn(
                                    'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors hover:bg-accent',
                                    value === lokasi &&
                                        'border-primary bg-muted font-medium',
                                )}
                            >
                                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <span className="flex-1">{lokasi}</span>
                                {value === lokasi && (
                                    <Check className="h-4 w-4 shrink-0 text-foreground" />
                                )}
                            </button>
                        ))}
                        {filtered.length === 0 && !queryProper && (
                            <p className="py-4 text-center text-sm text-muted-foreground">
                                Tidak ada lokasi yang cocok.
                            </p>
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}

// ─── Main Form ────────────────────────────────────────────────────────────────
export default function P2hForm({
    units,
    inspectionItems,
    staffUsers,
    sites,
}: Props) {
    const { homeHref } = useShellNavigation();
    const { auth, options } = usePage<{
        auth: {
            user: {
                id: number;
                name: string;
                nik?: string | null;
                jabatan?: string;
            } | null;
        };
        options: { shifts: string[] };
    }>().props;
    const jobSiteOptions = sites.map((s) => s.name);
    const shiftOptions = options?.shifts ?? ['Shift I', 'Shift II'];

    // Dibaca sekali pada mount — mencegah re-read localStorage di strict mode double-render
    const [draft] = useState(loadDraft);

    const [step, setStep] = useState(draft.step ?? 1);
    const topRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const reduceMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;
        topRef.current?.scrollIntoView({
            behavior: reduceMotion ? 'auto' : 'smooth',
            block: 'start',
        });
    }, [step]);

    // Step 1
    const [selectedUnitId, setSelectedUnitId] = useState<string>(
        draft.selectedUnitId ?? '',
    );
    const [unitQuery, setUnitQuery] = useState('');
    const [slotInfo, setSlotInfo] = useState<SlotInfo | null>(null);
    const [checkingSlot, setCheckingSlot] = useState(false);
    const [jobSite, setJobSite] = useState(draft.jobSite ?? '');
    const [lokasiKerja, setLokasiKerja] = useState(draft.lokasiKerja ?? '');
    const [kmAwal, setKmAwal] = useState(draft.kmAwal ?? '');
    // Default = shift yang sedang berjalan (docs/screens/driver.md)
    const [shift, setShift] = useState(
        draft.shift ||
            (shiftOptions.length === 2
                ? shiftOptions[
                      new Date().getHours() >= 6 && new Date().getHours() < 18
                          ? 0
                          : 1
                  ]
                : ''),
    );
    const [picApproverId, setPicApproverId] = useState<string>(
        draft.picApproverId ?? '',
    );

    // Step 2
    const [answers, setAnswers] = useState<Record<number, AnswerState>>(
        draft.answers ?? {},
    );

    // Step 3
    const [servisMingguan, setServisMingguan] = useState(
        draft.servisMingguan ?? false,
    );
    const [servisBerkala, setServisBerkala] = useState(
        draft.servisBerkala ?? false,
    );
    const [unscheduleBreakdown, setUnscheduleBreakdown] = useState(
        draft.unscheduleBreakdown ?? false,
    );
    const [lainnya, setLainnya] = useState(draft.lainnya ?? false);
    const [lainnyaText, setLainnyaText] = useState(draft.lainnyaText ?? '');
    const [catatanServis, setCatatanServis] = useState(
        draft.catatanServis ?? '',
    );
    const [kmUnit, setKmUnit] = useState(draft.kmUnit ?? '');
    const [jumlahLiter, setJumlahLiter] = useState(draft.jumlahLiter ?? '');

    // Step 4
    const [hmKmAkhir, setHmKmAkhir] = useState(draft.hmKmAkhir ?? '');
    const [kondisiAkhir, setKondisiAkhir] = useState<'Layak Pakai' | 'BD' | ''>(
        draft.kondisiAkhir ?? '',
    );
    const [justifikasiKondisi, setJustifikasiKondisi] = useState(
        draft.justifikasiKondisi ?? '',
    );
    const [attachments, setAttachments] = useState<File[]>([]);
    const [attachmentPreviews, setAttachmentPreviews] = useState<string[]>([]);
    const [compressing, setCompressing] = useState(false);
    const [compressingItems, setCompressingItems] = useState<
        Record<number, boolean>
    >({});
    const [submitting, setSubmitting] = useState(false);
    const [uploadPct, setUploadPct] = useState<number | null>(null);
    const [submitted, setSubmitted] = useState<{
        unit: string;
        layak: boolean;
        pic: string | null;
    } | null>(null);
    const [sigEmpty, setSigEmpty] = useState(true);
    const sigPadRef = useRef<ReactSignatureCanvas | null>(null);
    const [hasDraft] = useState(() => Boolean(draft.selectedUnitId));

    const selectedUnit = units.find((u) => u.id === Number(selectedUnitId));
    const pickerUnits = useMemo(() => {
        const q = unitQuery.trim().toLowerCase();

        return q
            ? units.filter((u) =>
                  `${u.no_unit} ${u.jenis_unit}`.toLowerCase().includes(q),
              )
            : units;
    }, [units, unitQuery]);

    // Jabatan Approval tidak memerlukan persetujuan PIC — User LV 1 & LV 2 tetap perlu
    const isApprover = auth?.user?.jabatan === 'Approval';
    const needsApproval =
        selectedUnit?.jenis_unit === 'Light Vehicle' && !isApprover;

    // PIC approval LV selalu berjabatan Approval
    const picJabatanLabel = 'Approval';

    // Filter staffUsers sesuai department unit LV yang dipilih, kecualikan diri sendiri
    const eligibleStaff = staffUsers.filter((s) => s.id !== auth?.user?.id);
    const filteredStaffUsers =
        selectedUnit?.jenis_unit === 'Light Vehicle' && selectedUnit?.department
            ? eligibleStaff.filter(
                  (s) => s.department === selectedUnit.department,
              )
            : eligibleStaff;

    // Hapus picApproverId jika tidak lagi ada di filteredStaffUsers (misal: unit berubah atau draft lama)
    useEffect(() => {
        if (
            needsApproval &&
            picApproverId &&
            !filteredStaffUsers.some((s) => String(s.id) === picApproverId)
        ) {
            setPicApproverId('');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filteredStaffUsers]);

    const p2hScore = useMemo(() => {
        const total = inspectionItems.length;

        if (total === 0) {
            return null;
        }

        const layakCount = Object.values(answers).filter(
            (a) => a.kondisi === 'Layak',
        ).length;

        return Math.round((layakCount / total) * 100);
    }, [answers, inspectionItems.length]);

    const hasAATidakLayak = useMemo(() => {
        return inspectionItems.some(
            (item) =>
                item.kode_bahaya === 'AA' &&
                answers[item.id]?.kondisi === 'Tidak Layak',
        );
    }, [answers, inspectionItems]);

    const recommendedKondisi =
        p2hScore !== null
            ? hasAATidakLayak || p2hScore < 80
                ? 'BD'
                : 'Layak Pakai'
            : null;
    const isOverride =
        kondisiAkhir !== '' &&
        recommendedKondisi !== null &&
        kondisiAkhir !== recommendedKondisi;

    const filledCount = useMemo(
        () => Object.values(answers).filter((a) => a.kondisi !== null).length,
        [answers],
    );

    const tlCount = useMemo(
        () =>
            Object.values(answers).filter((a) => a.kondisi === 'Tidak Layak')
                .length,
        [answers],
    );

    const groupedItems = useMemo(() => {
        return SECTION_ORDER.reduce<
            Record<P2hInspectionItem['section'], P2hInspectionItem[]>
        >(
            (acc, section) => {
                acc[section] = inspectionItems.filter(
                    (item) => item.section === section,
                );

                return acc;
            },
            { A: [], B: [], C: [] },
        );
    }, [inspectionItems]);

    // Auto-save draft setiap kali ada perubahan state (kecuali tanda tangan)
    useEffect(() => {
        saveDraft({
            step,
            selectedUnitId,
            jobSite,
            lokasiKerja,
            kmAwal,
            shift,
            picApproverId,
            answers,
            servisMingguan,
            servisBerkala,
            unscheduleBreakdown,
            lainnya,
            lainnyaText,
            catatanServis,
            kmUnit,
            jumlahLiter,
            hmKmAkhir,
            kondisiAkhir,
            justifikasiKondisi,
        });
    }, [
        step,
        selectedUnitId,
        jobSite,
        lokasiKerja,
        kmAwal,
        shift,
        picApproverId,
        answers,
        servisMingguan,
        servisBerkala,
        unscheduleBreakdown,
        lainnya,
        lainnyaText,
        catatanServis,
        kmUnit,
        jumlahLiter,
        hmKmAkhir,
        kondisiAkhir,
        justifikasiKondisi,
    ]);

    const checkSlot = useCallback((unitId: string, attempt = 1) => {
        if (!unitId) {
            setSlotInfo(null);

            return;
        }

        setCheckingSlot(true);
        fetch(`/api/p2h/check-slot?unit_id=${unitId}`)
            .then((r) => {
                if (!r.ok) {
                    throw new Error(`HTTP ${r.status}`);
                }

                return r.json();
            })
            .then((data) => {
                setSlotInfo(data);
                setCheckingSlot(false);
            })
            .catch(() => {
                if (attempt < 3) {
                    setTimeout(
                        () => checkSlot(unitId, attempt + 1),
                        attempt * 1000,
                    );
                } else {
                    setSlotInfo(null);
                    setCheckingSlot(false);
                    toast.error(
                        'Gagal mengecek ketersediaan slot setelah 3 percobaan. Periksa koneksi internet.',
                        {
                            action: {
                                label: 'Coba Lagi',
                                onClick: () => checkSlot(unitId),
                            },
                        },
                    );
                }
            });
    }, []);

    useEffect(() => {
        checkSlot(selectedUnitId);
    }, [selectedUnitId, checkSlot]);

    const handleKondisiChange = useCallback(
        (itemId: number, kondisi: 'Layak' | 'Tidak Layak') => {
            setAnswers((prev) => ({
                ...prev,
                [itemId]: {
                    inspection_item_id: itemId,
                    kondisi,
                    keterangan: prev[itemId]?.keterangan ?? '',
                },
            }));
        },
        [],
    );

    const handleKeteranganChange = useCallback(
        (itemId: number, keterangan: string) => {
            setAnswers((prev) => ({
                ...prev,
                [itemId]: {
                    ...prev[itemId],
                    inspection_item_id: itemId,
                    kondisi: prev[itemId]?.kondisi ?? null,
                    keterangan,
                },
            }));
        },
        [],
    );

    const [itemAttachments, setItemAttachments] = useState<
        Record<number, File[]>
    >({});
    const [itemAttachmentPreviews, setItemAttachmentPreviews] = useState<
        Record<number, string[]>
    >({});

    const handleItemAttachmentChange = useCallback(
        async (itemId: number, files: FileList | null) => {
            if (!files || files.length === 0) {
                return;
            }

            setCompressingItems((prev) => ({ ...prev, [itemId]: true }));

            try {
                const compressed = await Promise.all(
                    Array.from(files).map((f) => compressImage(f)),
                );
                setItemAttachments((prev) => ({
                    ...prev,
                    [itemId]: [...(prev[itemId] ?? []), ...compressed],
                }));
                const previews = compressed.map((f) => URL.createObjectURL(f));
                setItemAttachmentPreviews((prev) => ({
                    ...prev,
                    [itemId]: [...(prev[itemId] ?? []), ...previews],
                }));
            } finally {
                setCompressingItems((prev) => ({ ...prev, [itemId]: false }));
            }
        },
        [],
    );

    const removeItemAttachment = useCallback((itemId: number, idx: number) => {
        setItemAttachments((prev) => {
            const arr = [...(prev[itemId] ?? [])];
            arr.splice(idx, 1);

            return { ...prev, [itemId]: arr };
        });
        setItemAttachmentPreviews((prev) => {
            const arr = [...(prev[itemId] ?? [])];
            URL.revokeObjectURL(arr[idx]);
            arr.splice(idx, 1);

            return { ...prev, [itemId]: arr };
        });
    }, []);

    const handleAttachmentFiles = useCallback(
        async (files: FileList | null) => {
            if (!files || files.length === 0) {
                return;
            }

            setCompressing(true);

            try {
                const compressed = await Promise.all(
                    Array.from(files).map((f) => compressImage(f)),
                );
                setAttachments((prev) => [...prev, ...compressed]);
                const previews = compressed.map((f) => URL.createObjectURL(f));
                setAttachmentPreviews((prev) => [...prev, ...previews]);
            } finally {
                setCompressing(false);
            }
        },
        [],
    );

    const removeAttachment = useCallback((idx: number) => {
        setAttachments((prev) => {
            const a = [...prev];
            a.splice(idx, 1);

            return a;
        });
        setAttachmentPreviews((prev) => {
            const a = [...prev];
            URL.revokeObjectURL(a[idx]);
            a.splice(idx, 1);

            return a;
        });
    }, []);

    const validateStep = (s: number): string | null => {
        if (s === 1) {
            if (!selectedUnitId) {
                return 'Pilih unit terlebih dahulu.';
            }

            if (checkingSlot) {
                return 'Menunggu pengecekan slot…';
            }

            if (!shift) {
                return 'Shift wajib dipilih.';
            }

            if (
                kmAwal &&
                slotInfo?.last_hm_km_akhir != null &&
                Number(kmAwal) < slotInfo.last_hm_km_akhir
            ) {
                return `HM/KM Awal tidak boleh lebih rendah dari HM/KM Akhir sebelumnya (${slotInfo.last_hm_km_akhir.toLocaleString('id-ID')}).`;
            }

            if (needsApproval) {
                if (filteredStaffUsers.length === 0) {
                    return `Tidak ada ${picJabatanLabel} yang tersedia sebagai PIC untuk unit ini. Hubungi admin.`;
                }

                if (!picApproverId) {
                    return 'PIC yang akan menyetujui P2H wajib dipilih.';
                }

                if (
                    !filteredStaffUsers.some(
                        (s) => String(s.id) === picApproverId,
                    )
                ) {
                    return 'PIC yang dipilih tidak valid. Silakan pilih kembali.';
                }
            }
        }

        if (s === 2) {
            for (const item of inspectionItems) {
                const ans = answers[item.id];

                if (!ans?.kondisi) {
                    return `Item "${item.nama_item}" belum dipilih.`;
                }

                if (ans.kondisi === 'Tidak Layak' && !ans.keterangan.trim()) {
                    return `Keterangan wajib diisi untuk item "${item.nama_item}".`;
                }
            }
        }

        if (s === 4) {
            if (!kondisiAkhir) {
                return 'Keputusan kondisi akhir unit wajib dipilih.';
            }

            if (isOverride && !justifikasiKondisi.trim()) {
                return 'Alasan keputusan wajib diisi karena berbeda dari rekomendasi sistem.';
            }

            if (sigEmpty || sigPadRef.current?.isEmpty()) {
                return 'Tanda tangan wajib dibuat.';
            }
        }

        return null;
    };

    const goNext = () => {
        const err = validateStep(step);

        if (err) {
            toast.error(err);

            return;
        }

        setStep((s) => Math.min(s + 1, 4));
    };

    const goPrev = () => {
        setStep((s) => Math.max(s - 1, 1));
    };

    const handleSubmit = () => {
        const err = validateStep(4);

        if (err) {
            toast.error(err);

            return;
        }

        setSubmitting(true);
        const paraf = sigPadRef.current?.toDataURL('image/png') ?? '';

        // Tolak signature yang terlalu besar (> 2MB base64 ≈ ~1.5MB PNG)
        const MAX_SIG_BYTES = 2 * 1024 * 1024;

        if (paraf.length > MAX_SIG_BYTES) {
            setSubmitting(false);
            toast.error(
                'Ukuran tanda tangan terlalu besar. Coba ulangi tanda tangan.',
            );

            return;
        }

        const answersArray = inspectionItems.map((item) => ({
            inspection_item_id: item.id,
            kondisi: answers[item.id]!.kondisi,
            keterangan: answers[item.id]?.keterangan || null,
        }));

        clearDraft();

        // Build payload — attachments require forceFormData
        const itemAttachmentsFlat: Record<string, File[]> = {};
        Object.entries(itemAttachments).forEach(([itemId, files]) => {
            if (files.length > 0) {
                itemAttachmentsFlat[`item_attachments[${itemId}][]`] = files;
            }
        });

        router.post(
            '/p2h',
            {
                unit_id: Number(selectedUnitId),
                job_site: jobSite || null,
                lokasi_kerja: lokasiKerja || null,
                km_awal: kmAwal ? Number(kmAwal) : null,
                hm_km_akhir: hmKmAkhir ? Number(hmKmAkhir) : null,
                shift,
                pic_approver_id:
                    needsApproval && picApproverId
                        ? Number(picApproverId)
                        : null,
                paraf,
                answers: answersArray,
                kondisi_akhir: kondisiAkhir,
                justifikasi_kondisi: justifikasiKondisi || null,
                service_info: {
                    servis_mingguan: servisMingguan,
                    servis_berkala: servisBerkala,
                    unschedule_breakdown: unscheduleBreakdown,
                    lainnya: lainnya ? lainnyaText : null,
                    catatan_servis: catatanServis || null,
                },
                fuel_log: {
                    km_unit: kmUnit ? Number(kmUnit) : null,
                    jumlah_liter: jumlahLiter ? Number(jumlahLiter) : null,
                },
                attachments,
                ...itemAttachmentsFlat,
            },
            {
                forceFormData: true,
                // Status "mengunggah %" (docs/02 PhotoCapture) — foto bisa besar di sinyal lemah
                onProgress: (e) =>
                    setUploadPct(
                        e?.percentage !== undefined
                            ? Math.round(e.percentage)
                            : null,
                    ),
                onFinish: () => setUploadPct(null),
                onSuccess: () => {
                    // Layar sukses (docs/screens/driver.md §7) sebelum kembali
                    try {
                        navigator.vibrate?.([10, 30, 10]);
                    } catch {
                        // Vibration API tidak tersedia
                    }

                    setSubmitting(false);
                    setSubmitted({
                        unit: selectedUnit?.no_unit ?? 'Unit',
                        layak: kondisiAkhir !== 'BD',
                        pic:
                            staffUsers.find(
                                (u) => String(u.id) === picApproverId,
                            )?.name ?? null,
                    });
                },
                onError: (errors) => {
                    setSubmitting(false);
                    // Kembalikan draft jika submit gagal
                    saveDraft({
                        step,
                        selectedUnitId,
                        jobSite,
                        lokasiKerja,
                        kmAwal,
                        shift,
                        picApproverId,
                        answers,
                        servisMingguan,
                        servisBerkala,
                        unscheduleBreakdown,
                        lainnya,
                        lainnyaText,
                        catatanServis,
                        kmUnit,
                        jumlahLiter,
                        hmKmAkhir,
                        kondisiAkhir,
                        justifikasiKondisi,
                    });
                    const keys = Object.keys(errors);
                    const messages = [...new Set(Object.values(errors))];

                    if (keys.length === 0) {
                        toast.error('Terjadi kesalahan. Periksa form kembali.');

                        return;
                    }

                    // Satu ringkasan (bukan satu toast per error) + pindah ke langkah pertama yang bermasalah
                    const errorStep = Math.min(...keys.map(stepForErrorKey));
                    setStep(errorStep);
                    toast.error(
                        `Periksa langkah ${errorStep} — ${STEPS[errorStep - 1].label}`,
                        {
                            description:
                                messages.slice(0, 3).join(' ') +
                                (messages.length > 3
                                    ? ` (+${messages.length - 3} lainnya)`
                                    : ''),
                        },
                    );
                },
            },
        );
    };

    const checklistProgress = Math.round(
        (filledCount / inspectionItems.length) * 100,
    );

    if (submitted) {
        return (
            <>
                <Head title="P2H terkirim" />
                <SubmitSuccess {...submitted} homeHref={homeHref} />
            </>
        );
    }

    return (
        <>
            <Head title="Form P2H" />

            <div ref={topRef} className="flex min-h-dvh flex-col">
                {/* ── App bar form (docs/screens/driver.md) ── */}
                <div className="sticky top-0 z-20 border-b px-4 pt-3 pb-4 blurbar">
                    <div className="mx-auto max-w-[640px]">
                        <div className="mb-3 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    if (
                                        filledCount === 0 ||
                                        window.confirm(
                                            'Keluar dari Form P2H? Draft tetap tersimpan di perangkat ini.',
                                        )
                                    ) {
                                        router.visit(homeHref);
                                    }
                                }}
                                aria-label="Keluar dari Form P2H"
                                className="-ml-2 grid size-12 press place-items-center rounded-[12px] hover:bg-muted"
                            >
                                <X className="size-5" />
                            </button>
                            <div className="min-w-0 flex-1">
                                <h1 className="truncate text-lg font-semibold tracking-[-0.01em]">
                                    {STEPS[step - 1].title}
                                </h1>
                                <p className="truncate text-[13px] text-muted-foreground tnum">
                                    {[
                                        selectedUnit?.no_unit ?? 'Form P2H',
                                        shift,
                                        formatDate(new Date(), {
                                            withYear: false,
                                        }),
                                    ]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </p>
                            </div>
                        </div>
                        {hasDraft && (
                            <div className="mb-3 flex items-start justify-between gap-3 rounded-xl bg-warning-soft px-3 py-2 hc:border-2 hc:border-warning">
                                <p className="text-[13px]">
                                    Draft dilanjutkan otomatis.{' '}
                                    <span className="font-semibold">
                                        Foto &amp; tanda tangan tidak ikut
                                        tersimpan
                                    </span>{' '}
                                    — unggah ulang sebelum kirim.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        clearDraft();
                                        window.location.reload();
                                    }}
                                    className="shrink-0 text-[13px] font-semibold underline underline-offset-4"
                                >
                                    Mulai ulang
                                </button>
                            </div>
                        )}
                        <StepIndicator
                            current={step}
                            done={step === 2 ? filledCount : undefined}
                            total={
                                step === 2 ? inspectionItems.length : undefined
                            }
                        />
                    </div>
                </div>

                {/* ── Step Content ── */}
                <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col gap-4 p-4 pb-6">
                    {/* ══════════════════════════════════════════
                        STEP 1 — Unit & Shift
                    ══════════════════════════════════════════ */}
                    {step === 1 && (
                        <>
                            {/* Shift — default shift berjalan (FormP2H.png) */}
                            <section className="space-y-2">
                                <h2 className="text-sm font-medium">Shift</h2>
                                <Segmented
                                    label="Shift"
                                    size="lg"
                                    className="grid w-full auto-cols-fr grid-flow-col"
                                    value={shift}
                                    onChange={setShift}
                                    options={shiftOptions.map((s, i) => ({
                                        value: s,
                                        label: (
                                            <span className="flex flex-col items-center leading-tight">
                                                <span className="font-semibold">
                                                    {s}
                                                </span>
                                                {shiftOptions.length === 2 && (
                                                    <span className="text-xs font-normal text-muted-foreground">
                                                        {i === 0
                                                            ? '06:00–18:00'
                                                            : '18:00–06:00'}
                                                    </span>
                                                )}
                                            </span>
                                        ),
                                    }))}
                                />
                            </section>

                            {/* Unit — daftar pilih inline */}
                            <section className="space-y-2">
                                <h2 className="text-sm font-medium">Unit</h2>
                                {units.length > 5 && (
                                    <label className="field flex h-[52px] items-center gap-3 rounded-[12px] border-(length:--bw) border-input bg-background px-4">
                                        <Search
                                            className="size-5 shrink-0 text-muted-foreground"
                                            aria-hidden
                                        />
                                        <input
                                            type="search"
                                            value={unitQuery}
                                            onChange={(e) =>
                                                setUnitQuery(e.target.value)
                                            }
                                            placeholder="Cari kode atau jenis unit"
                                            aria-label="Cari unit"
                                            className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
                                        />
                                    </label>
                                )}
                                {units.length === 0 ? (
                                    <p className="rounded-[14px] bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
                                        Belum ada unit untuk akun Anda.
                                        Hubungi admin site untuk penugasan
                                        unit.
                                    </p>
                                ) : (
                                    <div
                                        role="radiogroup"
                                        aria-label="Pilih unit"
                                        className="space-y-2"
                                    >
                                        {pickerUnits.map((unit) => {
                                            const isSelected =
                                                String(unit.id) ===
                                                selectedUnitId;
                                            const notReady =
                                                unit.unit_status !== 'ready';

                                            return (
                                                <button
                                                    key={unit.id}
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={isSelected}
                                                    onClick={() => {
                                                        setSelectedUnitId(
                                                            String(unit.id),
                                                        );
                                                        setPicApproverId('');
                                                    }}
                                                    className={cn(
                                                        'flex min-h-[72px] w-full press items-center gap-3 rounded-[14px] border-(length:--bw) bg-card px-4 py-3 text-left',
                                                        isSelected
                                                            ? 'border-foreground ring-1 ring-foreground'
                                                            : 'hover:border-foreground/30',
                                                        !isSelected &&
                                                            (notReady ||
                                                                unit.filled_at) &&
                                                            'opacity-60',
                                                    )}
                                                >
                                                    <span
                                                        aria-hidden
                                                        className={cn(
                                                            'grid size-6 shrink-0 place-items-center rounded-full border-2',
                                                            isSelected
                                                                ? 'border-foreground'
                                                                : 'border-input',
                                                        )}
                                                    >
                                                        {isSelected && (
                                                            <span className="size-3 rounded-full bg-foreground" />
                                                        )}
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="flex items-center gap-2">
                                                            <span className="text-[17px] font-semibold tnum">
                                                                {unit.no_unit}
                                                            </span>
                                                            {unit.assigned && (
                                                                <span className="rounded-md bg-brand px-1.5 py-0.5 text-[11px] font-semibold text-black">
                                                                    Ditugaskan
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span className="block truncate text-[13px] text-muted-foreground">
                                                            {unit.jenis_unit}
                                                            {unit.site_name &&
                                                                ` · ${unit.site_name}`}
                                                        </span>
                                                    </span>
                                                    {unit.filled_at ? (
                                                        <span
                                                            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
                                                            title={
                                                                unit.filled_by
                                                                    ? `Diisi ${unit.filled_by}`
                                                                    : undefined
                                                            }
                                                        >
                                                            <Lock
                                                                className="size-3"
                                                                aria-hidden
                                                            />
                                                            Terisi{' '}
                                                            {unit.filled_at}
                                                        </span>
                                                    ) : (
                                                        <StatusPill
                                                            status={
                                                                unit.unit_status
                                                            }
                                                            size="sm"
                                                        />
                                                    )}
                                                </button>
                                            );
                                        })}
                                        {pickerUnits.length === 0 && (
                                            <p className="px-1 py-4 text-sm text-muted-foreground">
                                                Tidak ada unit yang cocok
                                                dengan “{unitQuery}”.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {checkingSlot && (
                                    <p className="flex items-center gap-2 px-1 text-[13px] text-muted-foreground">
                                        <Loader2 className="size-4 animate-spin" />
                                        Memeriksa ketersediaan slot…
                                    </p>
                                )}
                                {slotInfo &&
                                    !checkingSlot &&
                                    slotInfo.slot_terisi > 0 && (
                                        <p className="flex items-start gap-2 rounded-[12px] bg-info-soft px-3 py-2.5 text-[13px] text-info">
                                            <Info className="mt-0.5 size-4 shrink-0" />
                                            Unit ini sudah diisi{' '}
                                            {slotInfo.slot_terisi}× hari ini.
                                            Anda mengisi entry ke-
                                            {slotInfo.next_slot} (pergantian
                                            driver); setiap entry disetujui
                                            terpisah.
                                        </p>
                                    )}
                            </section>

                            {/* HM/KM awal */}
                            <section className="space-y-2">
                                <Label
                                    htmlFor="km-awal"
                                    className="text-sm font-medium"
                                >
                                    HM/KM awal{' '}
                                    <span className="font-normal text-muted-foreground">
                                        (opsional)
                                    </span>
                                </Label>
                                <Input
                                    id="km-awal"
                                    type="number"
                                    inputMode="numeric"
                                    min={slotInfo?.last_hm_km_akhir ?? 0}
                                    value={kmAwal}
                                    onChange={(e) => setKmAwal(e.target.value)}
                                    placeholder="Contoh: 12500"
                                    aria-invalid={
                                        (!!kmAwal &&
                                            slotInfo?.last_hm_km_akhir !=
                                                null &&
                                            Number(kmAwal) <
                                                slotInfo.last_hm_km_akhir) ||
                                        undefined
                                    }
                                    className="h-[52px] rounded-[12px] text-base tnum"
                                />
                                {slotInfo?.last_hm_km_akhir != null && (
                                    <p
                                        className={cn(
                                            'text-[13px]',
                                            kmAwal &&
                                                Number(kmAwal) <
                                                    slotInfo.last_hm_km_akhir
                                                ? 'font-medium text-danger'
                                                : 'text-muted-foreground',
                                        )}
                                    >
                                        HM/KM akhir sesi sebelumnya{' '}
                                        {slotInfo.last_hm_km_akhir.toLocaleString(
                                            'id-ID',
                                        )}{' '}
                                        — nilai awal tidak boleh lebih rendah.
                                    </p>
                                )}
                            </section>

                            {/* Lokasi */}
                            <section className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="job-site"
                                        className="text-sm font-medium"
                                    >
                                        Job site{' '}
                                        <span className="font-normal text-muted-foreground">
                                            (opsional)
                                        </span>
                                    </Label>
                                    <Select
                                        value={jobSite}
                                        onValueChange={setJobSite}
                                    >
                                        <SelectTrigger
                                            id="job-site"
                                            className="h-[52px] w-full rounded-[12px] text-base"
                                        >
                                            <SelectValue placeholder="Pilih job site" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {jobSiteOptions.map((site) => (
                                                <SelectItem
                                                    key={site}
                                                    value={site}
                                                >
                                                    {site}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">
                                        Lokasi kerja{' '}
                                        <span className="font-normal text-muted-foreground">
                                            (opsional)
                                        </span>
                                    </Label>
                                    <LokasiCombobox
                                        value={lokasiKerja}
                                        onChange={setLokasiKerja}
                                    />
                                </div>
                            </section>

                            {/* PIC persetujuan — unit LV */}
                            {needsApproval && (
                                <section className="space-y-2">
                                    <h2 className="text-sm font-medium">
                                        PIC persetujuan{' '}
                                        <span className="text-danger">*</span>
                                    </h2>
                                    <p className="text-[13px] text-muted-foreground">
                                        P2H Light Vehicle perlu disetujui.
                                        Pilih {picJabatanLabel} yang akan
                                        meninjau dan menandatangani P2H ini.
                                    </p>
                                    {filteredStaffUsers.length === 0 ? (
                                        <p className="rounded-[12px] bg-danger-soft px-3 py-3 text-sm text-danger">
                                            Tidak ada {picJabatanLabel} dari
                                            departemen{' '}
                                            <strong>
                                                {selectedUnit?.department}
                                            </strong>{' '}
                                            yang terdaftar. Hubungi admin untuk
                                            menambahkan PIC.
                                        </p>
                                    ) : (
                                        <PicCombobox
                                            staffUsers={filteredStaffUsers}
                                            value={picApproverId}
                                            onChange={setPicApproverId}
                                        />
                                    )}
                                </section>
                            )}

                            <p className="flex items-start gap-2 text-[13px] text-muted-foreground">
                                <Info className="mt-0.5 size-4 shrink-0" />
                                Pengemudi: {auth?.user?.name ?? '—'}. Satu
                                sesi = satu unit per hari; pergantian driver
                                tercatat sebagai entry terpisah.
                            </p>
                        </>
                    )}

                    {/* ══════════════════════════════════════════
                        STEP 2 — Checklist Pemeriksaan
                    ══════════════════════════════════════════ */}
                    {step === 2 && (
                        <>
                            {/* Progress */}
                            <Card>
                                <CardContent className="space-y-3 px-4 py-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-base font-semibold">
                                                Progress Pemeriksaan
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {filledCount} dari{' '}
                                                {inspectionItems.length} item
                                                sudah diperiksa
                                            </p>
                                        </div>
                                        <span className="text-2xl font-semibold text-foreground">
                                            {checklistProgress}%
                                        </span>
                                    </div>
                                    <Progress
                                        value={checklistProgress}
                                        className="h-3 rounded-full"
                                    />
                                    <div className="flex flex-wrap items-center gap-3 text-xs">
                                        <span className="flex items-center gap-1 text-success">
                                            <span className="h-2 w-2 rounded-full bg-success" />
                                            {filledCount - tlCount} Layak
                                        </span>
                                        {tlCount > 0 && (
                                            <span className="flex items-center gap-1 text-danger">
                                                <span className="h-2 w-2 rounded-full bg-danger" />
                                                {tlCount} Tidak Layak
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1 text-muted-foreground">
                                            <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                                            {inspectionItems.length -
                                                filledCount}{' '}
                                            Belum
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Instruksi */}
                            <div className="flex items-start gap-2.5 rounded-xl border border-info/40 bg-info-soft px-4 py-3">
                                <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                                <p className="text-sm text-info">
                                    Periksa setiap komponen kendaraan, lalu
                                    pilih <strong>Layak</strong> atau{' '}
                                    <strong>Tidak Layak</strong>. Jika Tidak
                                    Layak, wajib isi keterangan.
                                </p>
                            </div>

                            {/* Checklist groups per seksi */}
                            <div className="space-y-2">
                                {SECTION_ORDER.map((section) => {
                                    const items = groupedItems[section];

                                    if (items.length === 0) {
                                        return null;
                                    }

                                    return (
                                        <ChecklistGroup
                                            key={section}
                                            section={section}
                                            items={items}
                                            answers={answers}
                                            onChange={handleKondisiChange}
                                            onKeteranganChange={
                                                handleKeteranganChange
                                            }
                                            itemAttachments={itemAttachments}
                                            itemAttachmentPreviews={
                                                itemAttachmentPreviews
                                            }
                                            compressingItems={compressingItems}
                                            onItemAttachmentChange={
                                                handleItemAttachmentChange
                                            }
                                            onRemoveItemAttachment={
                                                removeItemAttachment
                                            }
                                            defaultOpen={section === 'A'}
                                        />
                                    );
                                })}
                            </div>

                            {tlCount > 0 && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>
                                        {tlCount} Item Tidak Layak
                                    </AlertTitle>
                                    <AlertDescription className="text-xs">
                                        Pastikan keterangan sudah diisi untuk
                                        semua item yang ditandai Tidak Layak
                                        sebelum melanjutkan.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </>
                    )}

                    {/* ══════════════════════════════════════════
                        STEP 3 — Servis & BBM
                    ══════════════════════════════════════════ */}
                    {step === 3 && (
                        <>
                            {/* Servis */}
                            <Card>
                                <CardHeader className="px-4 pb-0">
                                    <div className="flex items-center gap-2">
                                        <Wrench className="h-4 w-4 text-muted-foreground" />
                                        <CardTitle className="text-base">
                                            Informasi Servis
                                        </CardTitle>
                                    </div>
                                    <CardDescription>
                                        Centang jika ada kegiatan servis hari
                                        ini (opsional)
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3 px-4">
                                    <div className="space-y-2">
                                        {[
                                            {
                                                id: 'servis_mingguan',
                                                label: 'Servis Mingguan',
                                                desc: 'Servis rutin setiap minggu',
                                                value: servisMingguan,
                                                setter: setServisMingguan,
                                            },
                                            {
                                                id: 'servis_berkala',
                                                label: 'Servis Berkala',
                                                desc: 'Servis per jarak tempuh / jam kerja',
                                                value: servisBerkala,
                                                setter: setServisBerkala,
                                            },
                                            {
                                                id: 'unschedule',
                                                label: 'Unschedule / Break Down',
                                                desc: 'Servis darurat akibat kerusakan',
                                                value: unscheduleBreakdown,
                                                setter: setUnscheduleBreakdown,
                                            },
                                        ].map((srv) => (
                                            <label
                                                key={srv.id}
                                                htmlFor={srv.id}
                                                className="flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors hover:bg-muted/40 has-[[data-state=checked]]:border-foreground has-[[data-state=checked]]:bg-brand-soft"
                                            >
                                                <Checkbox
                                                    id={srv.id}
                                                    checked={srv.value}
                                                    onCheckedChange={(v) =>
                                                        srv.setter(Boolean(v))
                                                    }
                                                    className="mt-0.5 h-5 w-5"
                                                />
                                                <div>
                                                    <p className="text-base font-medium">
                                                        {srv.label}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {srv.desc}
                                                    </p>
                                                </div>
                                            </label>
                                        ))}

                                        {/* Lainnya */}
                                        <label
                                            htmlFor="lainnya"
                                            className="flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors hover:bg-muted/40 has-[[data-state=checked]]:border-foreground has-[[data-state=checked]]:bg-brand-soft"
                                        >
                                            <Checkbox
                                                id="lainnya"
                                                checked={lainnya}
                                                onCheckedChange={(v) =>
                                                    setLainnya(Boolean(v))
                                                }
                                                className="mt-0.5 h-5 w-5"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-base font-medium">
                                                    Lainnya
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    Servis jenis lain — sebutkan
                                                    di bawah
                                                </p>
                                                {lainnya && (
                                                    <Input
                                                        value={lainnyaText}
                                                        onChange={(e) =>
                                                            setLainnyaText(
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="Sebutkan jenis servis lainnya…"
                                                        className="mt-2 h-10 w-full text-sm"
                                                        onClick={(e) =>
                                                            e.stopPropagation()
                                                        }
                                                    />
                                                )}
                                            </div>
                                        </label>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-sm font-medium">
                                            Catatan Servis
                                        </Label>
                                        <Textarea
                                            value={catatanServis}
                                            onChange={(e) =>
                                                setCatatanServis(e.target.value)
                                            }
                                            placeholder="Tulis catatan tambahan tentang kondisi atau pekerjaan servis (opsional)…"
                                            className="min-h-[88px] resize-none text-sm"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* BBM */}
                            <Card>
                                <CardHeader className="px-4 pb-0">
                                    <div className="flex items-center gap-2">
                                        <Fuel className="h-4 w-4 text-muted-foreground" />
                                        <CardTitle className="text-base">
                                            Pengisian Bahan Bakar
                                        </CardTitle>
                                    </div>
                                    <CardDescription>
                                        Isi jika ada pengisian BBM hari ini.
                                        Biarkan kosong jika tidak ada.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3 px-4">
                                    <div className="space-y-1.5">
                                        <Label
                                            htmlFor="km-unit"
                                            className="text-sm font-medium"
                                        >
                                            KM Saat Isi BBM
                                        </Label>
                                        <Input
                                            id="km-unit"
                                            type="number"
                                            inputMode="numeric"
                                            min={0}
                                            value={kmUnit}
                                            onChange={(e) =>
                                                setKmUnit(e.target.value)
                                            }
                                            placeholder="Contoh: 12550"
                                            className="h-12 text-base"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label
                                            htmlFor="jumlah-liter"
                                            className="text-sm font-medium"
                                        >
                                            Jumlah Liter
                                        </Label>
                                        <Input
                                            id="jumlah-liter"
                                            type="number"
                                            inputMode="decimal"
                                            min={0}
                                            step="0.01"
                                            value={jumlahLiter}
                                            onChange={(e) =>
                                                setJumlahLiter(e.target.value)
                                            }
                                            placeholder="Contoh: 50.5"
                                            className="h-12 text-base"
                                        />
                                    </div>
                                    {kmUnit && jumlahLiter && (
                                        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
                                            <Fuel className="h-4 w-4 shrink-0 text-muted-foreground" />
                                            <p className="text-xs text-muted-foreground">
                                                Pengisian{' '}
                                                <strong>
                                                    {jumlahLiter} liter
                                                </strong>{' '}
                                                pada KM{' '}
                                                <strong>
                                                    {Number(
                                                        kmUnit,
                                                    ).toLocaleString('id-ID')}
                                                </strong>
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </>
                    )}

                    {/* ══════════════════════════════════════════
                        STEP 4 — Konfirmasi & Tanda Tangan
                    ══════════════════════════════════════════ */}
                    {step === 4 && (
                        <>
                            {/* Ringkasan */}
                            <Card>
                                <CardHeader className="px-4 pb-0">
                                    <CardTitle className="text-base">
                                        Ringkasan Pemeriksaan
                                    </CardTitle>
                                    <CardDescription>
                                        Periksa kembali sebelum tanda tangan
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-0 px-4">
                                    {/* Unit & Driver */}
                                    <div className="mb-3 rounded-xl bg-muted/40 px-3 py-1">
                                        <SummaryRow
                                            icon={Truck}
                                            label="Unit"
                                            value={selectedUnit?.no_unit ?? '-'}
                                        />
                                        <Separator />
                                        <SummaryRow
                                            icon={Truck}
                                            label="Jenis"
                                            value={
                                                selectedUnit?.jenis_unit ?? '-'
                                            }
                                        />
                                        <Separator />
                                        <SummaryRow
                                            icon={User}
                                            label="Pengemudi"
                                            value={auth?.user?.name ?? '-'}
                                        />
                                        <Separator />
                                        <SummaryRow
                                            icon={Sun}
                                            label="Shift"
                                            value={shift}
                                        />
                                        {jobSite && (
                                            <>
                                                <Separator />
                                                <SummaryRow
                                                    label="Job Site"
                                                    value={jobSite}
                                                />
                                            </>
                                        )}
                                        {lokasiKerja && (
                                            <>
                                                <Separator />
                                                <SummaryRow
                                                    label="Lokasi Kerja"
                                                    value={lokasiKerja}
                                                />
                                            </>
                                        )}
                                        <Separator />
                                        <SummaryRow
                                            icon={Gauge}
                                            label="HM/KM Awal"
                                            value={
                                                kmAwal
                                                    ? Number(
                                                          kmAwal,
                                                      ).toLocaleString('id-ID')
                                                    : '-'
                                            }
                                        />
                                        {needsApproval &&
                                            picApproverId &&
                                            (() => {
                                                const pic = staffUsers.find(
                                                    (s) =>
                                                        String(s.id) ===
                                                        picApproverId,
                                                );

                                                return pic ? (
                                                    <>
                                                        <Separator />
                                                        <SummaryRow
                                                            icon={User}
                                                            label="PIC Approval"
                                                            value={`${pic.name} (${pic.jabatan})`}
                                                        />
                                                    </>
                                                ) : null;
                                            })()}
                                    </div>

                                    {/* Hasil Checklist */}
                                    <div className="mb-3 space-y-1">
                                        <p className="px-1 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                            Hasil Checklist
                                        </p>
                                        <div className="rounded-xl bg-muted/40 px-3 py-1">
                                            <div className="flex items-center gap-3 py-2">
                                                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                                                <span className="flex-1 text-sm text-muted-foreground">
                                                    Item Layak
                                                </span>
                                                <Badge
                                                    variant="secondary"
                                                    className="bg-success-soft text-success"
                                                >
                                                    {filledCount - tlCount} /{' '}
                                                    {inspectionItems.length}
                                                </Badge>
                                            </div>
                                            {tlCount > 0 && (
                                                <>
                                                    <Separator />
                                                    <div className="flex items-center gap-3 py-2">
                                                        <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                                                        <span className="flex-1 text-sm text-muted-foreground">
                                                            Item Tidak Layak
                                                        </span>
                                                        <Badge variant="destructive">
                                                            {tlCount} item
                                                        </Badge>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Servis & BBM — hanya jika ada */}
                                    {(servisMingguan ||
                                        servisBerkala ||
                                        unscheduleBreakdown ||
                                        lainnya ||
                                        kmUnit ||
                                        jumlahLiter) && (
                                        <div className="space-y-1">
                                            <p className="px-1 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                Servis & BBM
                                            </p>
                                            <div className="rounded-xl bg-muted/40 px-3 py-1">
                                                {(servisMingguan ||
                                                    servisBerkala ||
                                                    unscheduleBreakdown ||
                                                    lainnya) && (
                                                    <SummaryRow
                                                        icon={Wrench}
                                                        label="Servis"
                                                        value={[
                                                            servisMingguan &&
                                                                'Mingguan',
                                                            servisBerkala &&
                                                                'Berkala',
                                                            unscheduleBreakdown &&
                                                                'Breakdown',
                                                            lainnya &&
                                                                lainnyaText,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(', ')}
                                                    />
                                                )}
                                                {(kmUnit || jumlahLiter) && (
                                                    <>
                                                        {(servisMingguan ||
                                                            servisBerkala ||
                                                            unscheduleBreakdown ||
                                                            lainnya) && (
                                                            <Separator />
                                                        )}
                                                        <SummaryRow
                                                            icon={Fuel}
                                                            label="Pengisian BBM"
                                                            value={`${jumlahLiter || '-'} L @ ${kmUnit ? Number(kmUnit).toLocaleString('id-ID') : '-'} km`}
                                                        />
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {tlCount > 0 && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>
                                        {tlCount} Item Tidak Layak
                                    </AlertTitle>
                                    <AlertDescription className="text-xs">
                                        Ada item yang tidak layak. Pastikan
                                        sudah dilaporkan ke atasan / mekanik
                                        sebelum kendaraan dioperasikan.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Keputusan Kondisi Akhir */}
                            <Card
                                className={cn(
                                    'border-2',
                                    kondisiAkhir === 'Layak Pakai' &&
                                        'border-success',
                                    kondisiAkhir === 'BD' && 'border-danger',
                                    !kondisiAkhir && 'border-border',
                                )}
                            >
                                <CardHeader className="px-4 pb-0">
                                    <CardTitle className="text-base">
                                        Keputusan Kondisi Akhir Unit{' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </CardTitle>
                                    <CardDescription>
                                        Nyatakan kondisi unit setelah Anda
                                        periksa. Anda memiliki wewenang penuh.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 px-4">
                                    {/* Rekomendasi sistem */}
                                    {recommendedKondisi && (
                                        <div
                                            className={cn(
                                                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium',
                                                recommendedKondisi ===
                                                    'Layak Pakai'
                                                    ? 'bg-success-soft text-success'
                                                    : 'bg-danger-soft text-danger',
                                            )}
                                        >
                                            {recommendedKondisi ===
                                            'Layak Pakai' ? (
                                                <ShieldCheck className="h-4 w-4 shrink-0" />
                                            ) : (
                                                <ShieldAlert className="h-4 w-4 shrink-0" />
                                            )}
                                            <span>
                                                Rekomendasi P2H:{' '}
                                                <strong>
                                                    {recommendedKondisi}
                                                </strong>
                                                {hasAATidakLayak
                                                    ? ' — ada item AA (Stop) tidak layak'
                                                    : ` (score ${p2hScore}%)`}
                                            </span>
                                        </div>
                                    )}

                                    {/* Tombol pilihan */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setKondisiAkhir('Layak Pakai');

                                                if (
                                                    kondisiAkhir ===
                                                    'Layak Pakai'
                                                ) {
                                                    return;
                                                }

                                                setJustifikasiKondisi('');
                                            }}
                                            className={cn(
                                                'flex h-20 flex-col items-center justify-center gap-1.5 rounded-xl border-2 text-sm font-semibold transition-all duration-200',
                                                kondisiAkhir === 'Layak Pakai'
                                                    ? 'scale-[1.02] border-success bg-success-soft text-success shadow-md'
                                                    : 'border-border bg-background text-muted-foreground hover:border-success hover:text-success',
                                            )}
                                        >
                                            <ShieldCheck className="h-6 w-6" />
                                            Layak Pakai
                                            <span className="text-xs font-normal opacity-70">
                                                Unit siap beroperasi
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setKondisiAkhir('BD');

                                                if (kondisiAkhir === 'BD') {
                                                    return;
                                                }

                                                setJustifikasiKondisi('');
                                            }}
                                            className={cn(
                                                'flex h-20 flex-col items-center justify-center gap-1.5 rounded-xl border-2 text-sm font-semibold transition-all duration-200',
                                                kondisiAkhir === 'BD'
                                                    ? 'scale-[1.02] border-danger bg-danger-soft text-danger shadow-md'
                                                    : 'border-border bg-background text-muted-foreground hover:border-danger hover:text-danger',
                                            )}
                                        >
                                            <ShieldAlert className="h-6 w-6" />
                                            BD / Tidak Layak
                                            <span className="text-xs font-normal opacity-70">
                                                Tidak dapat dioperasikan
                                            </span>
                                        </button>
                                    </div>

                                    {/* Justifikasi — wajib jika override */}
                                    {isOverride && (
                                        <div className="animate-in space-y-1.5 duration-200 fade-in slide-in-from-top-2">
                                            <div className="flex items-center gap-1.5 rounded-lg bg-warning-soft px-3 py-2">
                                                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />
                                                <p className="text-xs font-medium text-warning">
                                                    Keputusan Anda berbeda dari
                                                    rekomendasi sistem. Alasan
                                                    wajib diisi.
                                                </p>
                                            </div>
                                            <Label className="text-sm font-medium">
                                                Alasan Keputusan{' '}
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            </Label>
                                            <Textarea
                                                value={justifikasiKondisi}
                                                onChange={(e) =>
                                                    setJustifikasiKondisi(
                                                        e.target.value.slice(
                                                            0,
                                                            500,
                                                        ),
                                                    )
                                                }
                                                placeholder="Jelaskan alasan keputusan Anda berbeda dari rekomendasi kalkulasi P2H…"
                                                className="min-h-[88px] resize-none text-sm"
                                                maxLength={500}
                                            />
                                            <p className="text-right text-xs text-muted-foreground">
                                                {justifikasiKondisi.length}/500
                                            </p>
                                        </div>
                                    )}

                                    {/* Catatan opsional — saat layak pakai atau sesuai rekomendasi */}
                                    {kondisiAkhir &&
                                        (kondisiAkhir === 'Layak Pakai' ||
                                            !isOverride) && (
                                            <div className="space-y-1.5">
                                                <Label className="text-sm font-medium text-muted-foreground">
                                                    Catatan Tambahan (opsional)
                                                </Label>
                                                <Textarea
                                                    value={justifikasiKondisi}
                                                    onChange={(e) =>
                                                        setJustifikasiKondisi(
                                                            e.target.value.slice(
                                                                0,
                                                                500,
                                                            ),
                                                        )
                                                    }
                                                    placeholder="Tambahkan catatan jika diperlukan…"
                                                    className="min-h-[64px] resize-none text-sm"
                                                    maxLength={500}
                                                />
                                            </div>
                                        )}
                                </CardContent>
                            </Card>

                            {/* HM/KM Akhir */}
                            <Card>
                                <CardHeader className="px-4 pb-0">
                                    <div className="flex items-center gap-2">
                                        <Gauge className="h-4 w-4 text-muted-foreground" />
                                        <CardTitle className="text-base">
                                            HM/KM Akhir
                                        </CardTitle>
                                    </div>
                                    <CardDescription>
                                        Isi HM/KM saat selesai shift (opsional)
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2 px-4">
                                    <Input
                                        id="hm-km-akhir"
                                        type="number"
                                        inputMode="numeric"
                                        min={0}
                                        value={hmKmAkhir}
                                        onChange={(e) =>
                                            setHmKmAkhir(e.target.value)
                                        }
                                        placeholder="Contoh: 12700"
                                        className="h-14 text-xl font-semibold tracking-wide"
                                    />
                                    {hmKmAkhir && (
                                        <p className="text-xs text-muted-foreground">
                                            ={' '}
                                            {Number(hmKmAkhir).toLocaleString(
                                                'id-ID',
                                            )}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Lampiran Foto */}
                            <Card>
                                <CardHeader className="px-4 pb-0">
                                    <div className="flex items-center gap-2">
                                        <ImagePlus className="h-4 w-4 text-muted-foreground" />
                                        <CardTitle className="text-base">
                                            Lampiran Foto
                                        </CardTitle>
                                    </div>
                                    <CardDescription>
                                        Lampirkan foto sebagai bukti pemeriksaan
                                        (opsional). Foto akan dikompresi
                                        otomatis.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3 px-4">
                                    <PhotoPicker
                                        previews={attachmentPreviews}
                                        processing={compressing}
                                        onFiles={handleAttachmentFiles}
                                        onRemove={removeAttachment}
                                    />
                                    {!compressing &&
                                        attachments.length === 0 && (
                                            <p className="text-xs text-destructive">
                                                Wajib melampirkan minimal 1 foto
                                            </p>
                                        )}
                                    {attachments.length > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            {attachments.length} foto terlampir
                                        </p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Tanda Tangan */}
                            <Card>
                                <CardHeader className="px-4 pb-0">
                                    <div className="flex items-center gap-2">
                                        <PenLine className="h-4 w-4 text-muted-foreground" />
                                        <CardTitle className="text-base">
                                            Tanda Tangan Driver
                                        </CardTitle>
                                    </div>
                                    <CardDescription>
                                        Tanda tangani menggunakan jari atau
                                        mouse sebagai pernyataan bahwa
                                        pemeriksaan telah dilakukan dengan jujur
                                        dan benar.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="px-4">
                                    <SignaturePad
                                        sigPadRef={sigPadRef}
                                        onEnd={() => setSigEmpty(false)}
                                        onClear={() => setSigEmpty(true)}
                                    />
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            </div>

            {/* ── Sticky Footer Navigation ── */}
            <StepNavFooter
                step={step}
                totalSteps={STEPS.length}
                steps={STEPS}
                onNext={goNext}
                onPrev={goPrev}
                onSubmit={handleSubmit}
                submitting={submitting}
                uploadPct={uploadPct}
                submitDisabled={submitting}
            />
        </>
    );
}

P2hForm.layout = {
    breadcrumbs: [{ title: 'Form P2H', href: '/p2h/form' }],
};
