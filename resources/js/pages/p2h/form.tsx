import ChecklistGroup from '@/components/P2h/ChecklistGroup';
import SignaturePad from '@/components/P2h/SignaturePad';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import type { AnswerState, P2hInspectionItem, Unit } from '@/types/pims';
import { Head, usePage } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import {
    AlertCircle,
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
    Hash,
    Loader2,
    Moon,
    PenLine,
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
import ReactSignatureCanvas from 'react-signature-canvas';
import { toast } from 'sonner';

interface StaffUser {
    id: number;
    name: string;
    jabatan: string;
    department: string;
}

interface Props {
    units: Unit[];
    inspectionItems: P2hInspectionItem[];
    staffUsers: StaffUser[];
}

interface SlotInfo {
    session_id: number | null;
    slot_terisi: number;
    slot_tersedia: boolean;
    next_slot: number;
}

const SECTION_ORDER: P2hInspectionItem['section'][] = ['A', 'B', 'C'];

const STEPS = [
    { id: 1, label: 'Unit & Shift', icon: Wrench },
    { id: 2, label: 'Pemeriksaan', icon: ClipboardList },
    { id: 3, label: 'Servis & BBM', icon: Droplets },
    { id: 4, label: 'Konfirmasi', icon: PenLine },
] as const;

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: number }) {
    return (
        <div className="flex items-center justify-between px-1">
            {STEPS.map((step, idx) => {
                const done = current > step.id;
                const active = current === step.id;
                return (
                    <div key={step.id} className="flex flex-1 items-center">
                        <div className="flex flex-col items-center gap-1">
                            <div
                                className={cn(
                                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-300',
                                    done && 'border-primary bg-primary text-primary-foreground',
                                    active && 'scale-110 border-primary bg-primary text-primary-foreground shadow-md',
                                    !done && !active && 'border-muted-foreground/30 bg-background text-muted-foreground/50',
                                )}
                            >
                                {done ? <CheckCircle2 className="h-4 w-4" /> : step.id}
                            </div>
                            <span
                                className={cn(
                                    'whitespace-nowrap text-center text-[10px] font-medium leading-tight',
                                    active ? 'text-primary' : done ? 'text-primary/70' : 'text-muted-foreground/50',
                                )}
                            >
                                {step.label}
                            </span>
                        </div>
                        {idx < STEPS.length - 1 && (
                            <div
                                className={cn(
                                    'mb-5 mx-1 h-0.5 flex-1 rounded-full transition-all duration-300',
                                    current > step.id ? 'bg-primary' : 'bg-muted',
                                )}
                            />
                        )}
                    </div>
                );
            })}
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
            {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
            <span className="min-w-0 flex-1 text-base text-muted-foreground">{label}</span>
            <span className={cn('text-base font-semibold', highlight && 'text-destructive')}>{value}</span>
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
    submitDisabled: boolean;
    checklistProgress?: number;
    filledCount?: number;
    totalItems?: number;
}

function StepNavFooter({
    step,
    totalSteps,
    steps,
    onNext,
    onPrev,
    onSubmit,
    submitting,
    submitDisabled,
    checklistProgress,
    filledCount,
    totalItems,
}: StepNavFooterProps) {
    const nextStep = steps.find((s) => s.id === step + 1);
    const isLastStep = step === totalSteps;

    return (
        <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:bottom-0">
            {/* Progress bar — step 2 only */}
            {checklistProgress !== undefined && (
                <div className="flex items-center gap-3 border-b px-4 py-2">
                    <Progress value={checklistProgress} className="h-1.5 flex-1" />
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {filledCount}/{totalItems} item
                    </span>
                </div>
            )}

            <div className="px-4 py-2">
                {isLastStep ? (
                    <Button
                        type="button"
                        size="lg"
                        onClick={onSubmit}
                        disabled={submitDisabled}
                        className="h-11 w-full gap-2 text-base font-bold"
                    >
                        {submitting ? (
                            <>
                                <Loader2 data-icon="inline-start" className="animate-spin" />
                                Menyimpan…
                            </>
                        ) : (
                            <>
                                <Send data-icon="inline-start" />
                                Kirim &amp; Selesaikan P2H
                            </>
                        )}
                    </Button>
                ) : (
                    <div className="flex items-center gap-2.5">
                        {step > 1 && (
                            <Button
                                type="button"
                                variant="outline"
                                size="lg"
                                onClick={onPrev}
                                className="h-11 flex-1 gap-1.5"
                            >
                                <ChevronLeft data-icon="inline-start" />
                                Kembali
                            </Button>
                        )}
                        <Button
                            type="button"
                            size="lg"
                            onClick={onNext}
                            className="h-11 flex-1 gap-1.5 font-semibold"
                        >
                            <span className="flex flex-col items-start leading-tight sm:flex-row sm:items-center sm:gap-1.5">
                                <span>{step === totalSteps - 1 ? 'Lanjut ke Konfirmasi' : 'Lanjutkan'}</span>
                                {nextStep && (
                                    <span className="text-[11px] font-normal text-primary-foreground/60 sm:hidden">
                                        Berikutnya: {nextStep.label}
                                    </span>
                                )}
                            </span>
                            <ArrowRight data-icon="inline-end" />
                        </Button>
                    </div>
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
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* storage full */ }
}

function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
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
        ? staffUsers.filter((s) =>
              s.name.toLowerCase().includes(query.toLowerCase()) ||
              (s.jabatan ?? '').toLowerCase().includes(query.toLowerCase()) ||
              (s.department ?? '').toLowerCase().includes(query.toLowerCase()),
          )
        : staffUsers;

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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
                    'flex h-11 w-full items-center gap-2 rounded-lg border px-3 text-sm transition-colors cursor-text',
                    open
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-input hover:border-muted-foreground/50',
                )}
                onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}
            >
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                    ref={inputRef}
                    value={open ? query : ''}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setOpen(true)}
                    placeholder={selected ? selected.name : 'Ketik nama, jabatan, atau departemen…'}
                    className={cn(
                        'flex-1 bg-transparent outline-none placeholder:text-muted-foreground',
                        !open && selected ? 'text-transparent placeholder:text-foreground' : '',
                    )}
                />
                {selected && (
                    <button
                        type="button"
                        onClick={clear}
                        className="shrink-0 rounded text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Hapus pilihan"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
                {!selected && (
                    <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
                )}
            </div>

            {/* Dropdown */}
            {open && (
                <div className="absolute left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
                    {filtered.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-muted-foreground text-center">
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
                                        isSelected && 'bg-primary/5',
                                    )}
                                >
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                        <User className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium">{s.name}</p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {s.jabatan}{s.department ? ` · ${s.department}` : ''}
                                        </p>
                                    </div>
                                    {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                                </button>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Main Form ────────────────────────────────────────────────────────────────
export default function P2hForm({ units, inspectionItems, staffUsers }: Props) {
    const { auth, options } = usePage<{ auth: { user: { id: number; name: string; nik?: string | null; jabatan?: string } | null }; options: { job_sites: string[]; shifts: string[] } }>().props;
    const jobSiteOptions = options?.job_sites ?? ['PT. WBK Site MAS', 'PT. WBK Site BAU'];
    const shiftOptions = options?.shifts ?? ['Shift I', 'Shift II'];

    // Dibaca sekali pada mount — mencegah re-read localStorage di strict mode double-render
    const [draft] = useState(loadDraft);

    const [step, setStep] = useState(draft.step ?? 1);
    const topRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [step]);

    // Step 1
    const [selectedUnitId, setSelectedUnitId] = useState<string>(draft.selectedUnitId ?? '');
    const [unitSheetOpen, setUnitSheetOpen] = useState(false);
    const [slotInfo, setSlotInfo] = useState<SlotInfo | null>(null);
    const [checkingSlot, setCheckingSlot] = useState(false);
    const [jobSite, setJobSite] = useState(draft.jobSite ?? '');
    const [lokasiKerja, setLokasiKerja] = useState(draft.lokasiKerja ?? '');
    const [kmAwal, setKmAwal] = useState(draft.kmAwal ?? '');
    const [shift, setShift] = useState(draft.shift ?? '');
    const [picApproverId, setPicApproverId] = useState<string>(draft.picApproverId ?? '');

    // Step 2
    const [answers, setAnswers] = useState<Record<number, AnswerState>>(draft.answers ?? {});

    // Step 3
    const [servisMingguan, setServisMingguan] = useState(draft.servisMingguan ?? false);
    const [servisBerkala, setServisBerkala] = useState(draft.servisBerkala ?? false);
    const [unscheduleBreakdown, setUnscheduleBreakdown] = useState(draft.unscheduleBreakdown ?? false);
    const [lainnya, setLainnya] = useState(draft.lainnya ?? false);
    const [lainnyaText, setLainnyaText] = useState(draft.lainnyaText ?? '');
    const [catatanServis, setCatatanServis] = useState(draft.catatanServis ?? '');
    const [kmUnit, setKmUnit] = useState(draft.kmUnit ?? '');
    const [jumlahLiter, setJumlahLiter] = useState(draft.jumlahLiter ?? '');

    // Step 4
    const [hmKmAkhir, setHmKmAkhir] = useState(draft.hmKmAkhir ?? '');
    const [kondisiAkhir, setKondisiAkhir] = useState<'Layak Pakai' | 'BD' | ''>(draft.kondisiAkhir ?? '');
    const [justifikasiKondisi, setJustifikasiKondisi] = useState(draft.justifikasiKondisi ?? '');
    const [submitting, setSubmitting] = useState(false);
    const [sigEmpty, setSigEmpty] = useState(true);
    const sigPadRef = useRef<ReactSignatureCanvas | null>(null);
    const [hasDraft] = useState(() => Boolean(draft.selectedUnitId));

    const selectedUnit = units.find((u) => u.id === Number(selectedUnitId));

    // Sr.Staff tidak memerlukan persetujuan PIC — Staff dan Non Staff tetap perlu
    const isSrStaff = auth?.user?.jabatan === 'Sr.Staff';
    const needsApproval = selectedUnit?.jenis_unit === 'Light Vehicle' && !isSrStaff;

    // Label jabatan PIC sesuai hierarki: Non-Staff → Staff, Staff → Sr.Staff
    const picJabatanLabel = auth?.user?.jabatan === 'Non Staff' ? 'Staff'
        : auth?.user?.jabatan === 'Staff' ? 'Sr.Staff'
        : 'Staff/Sr.Staff';

    // Filter staffUsers sesuai department unit LV yang dipilih, kecualikan diri sendiri
    const eligibleStaff = staffUsers.filter((s) => s.id !== auth?.user?.id);
    const filteredStaffUsers = selectedUnit?.jenis_unit === 'Light Vehicle' && selectedUnit?.department
        ? eligibleStaff.filter((s) => s.department === selectedUnit.department)
        : eligibleStaff;

    // Hapus picApproverId jika tidak lagi ada di filteredStaffUsers (misal: unit berubah atau draft lama)
    useEffect(() => {
        if (needsApproval && picApproverId && !filteredStaffUsers.some((s) => String(s.id) === picApproverId)) {
            setPicApproverId('');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filteredStaffUsers]);

    const p2hScore = useMemo(() => {
        const total = inspectionItems.length;
        if (total === 0) return null;
        const layakCount = Object.values(answers).filter((a) => a.kondisi === 'Layak').length;
        return Math.round((layakCount / total) * 100);
    }, [answers, inspectionItems.length]);

    const hasAATidakLayak = useMemo(() => {
        return inspectionItems.some(
            (item) => item.kode_bahaya === 'AA' && answers[item.id]?.kondisi === 'Tidak Layak',
        );
    }, [answers, inspectionItems]);

    const recommendedKondisi = p2hScore !== null
        ? (hasAATidakLayak || p2hScore < 80 ? 'BD' : 'Layak Pakai')
        : null;
    const isOverride = kondisiAkhir !== '' && recommendedKondisi !== null && kondisiAkhir !== recommendedKondisi;

    const filledCount = useMemo(
        () => Object.values(answers).filter((a) => a.kondisi !== null).length,
        [answers],
    );

    const tlCount = useMemo(
        () => Object.values(answers).filter((a) => a.kondisi === 'Tidak Layak').length,
        [answers],
    );

    const groupedItems = useMemo(() => {
        return SECTION_ORDER.reduce<Record<P2hInspectionItem['section'], P2hInspectionItem[]>>(
            (acc, section) => {
                acc[section] = inspectionItems.filter((item) => item.section === section);
                return acc;
            },
            { A: [], B: [], C: [] },
        );
    }, [inspectionItems]);

    // Auto-save draft setiap kali ada perubahan state (kecuali tanda tangan)
    useEffect(() => {
        saveDraft({
            step, selectedUnitId, jobSite, lokasiKerja, kmAwal, shift,
            picApproverId,
            answers, servisMingguan, servisBerkala, unscheduleBreakdown,
            lainnya, lainnyaText, catatanServis, kmUnit, jumlahLiter,
            hmKmAkhir, kondisiAkhir, justifikasiKondisi,
        });
    }, [
        step, selectedUnitId, jobSite, lokasiKerja, kmAwal, shift,
        picApproverId,
        answers, servisMingguan, servisBerkala, unscheduleBreakdown,
        lainnya, lainnyaText, catatanServis, kmUnit, jumlahLiter,
        hmKmAkhir, kondisiAkhir, justifikasiKondisi,
    ]);

    const checkSlot = useCallback((unitId: string, attempt = 1) => {
        if (!unitId) { setSlotInfo(null); return; }
        setCheckingSlot(true);
        fetch(`/api/p2h/check-slot?unit_id=${unitId}`)
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then((data) => { setSlotInfo(data); setCheckingSlot(false); })
            .catch(() => {
                if (attempt < 3) {
                    setTimeout(() => checkSlot(unitId, attempt + 1), attempt * 1000);
                } else {
                    setSlotInfo(null);
                    setCheckingSlot(false);
                    toast.error('Gagal mengecek ketersediaan slot setelah 3 percobaan. Periksa koneksi internet.', {
                        action: { label: 'Coba Lagi', onClick: () => checkSlot(unitId) },
                    });
                }
            });
    }, []);

    useEffect(() => {
        checkSlot(selectedUnitId);
    }, [selectedUnitId, checkSlot]);

    const handleKondisiChange = useCallback((itemId: number, kondisi: 'Layak' | 'Tidak Layak') => {
        setAnswers((prev) => ({
            ...prev,
            [itemId]: { inspection_item_id: itemId, kondisi, keterangan: prev[itemId]?.keterangan ?? '' },
        }));
    }, []);

    const handleKeteranganChange = useCallback((itemId: number, keterangan: string) => {
        setAnswers((prev) => ({
            ...prev,
            [itemId]: { ...prev[itemId], inspection_item_id: itemId, kondisi: prev[itemId]?.kondisi ?? null, keterangan },
        }));
    }, []);

    const validateStep = (s: number): string | null => {
        if (s === 1) {
            if (!selectedUnitId) return 'Pilih unit terlebih dahulu.';
            if (checkingSlot) return 'Menunggu pengecekan slot…';
            if (!shift) return 'Shift wajib dipilih.';
            if (needsApproval) {
                if (filteredStaffUsers.length === 0) return `Tidak ada ${picJabatanLabel} yang tersedia sebagai PIC untuk unit ini. Hubungi admin.`;
                if (!picApproverId) return 'PIC yang akan menyetujui P2H wajib dipilih.';
                if (!filteredStaffUsers.some((s) => String(s.id) === picApproverId)) return 'PIC yang dipilih tidak valid. Silakan pilih kembali.';
            }
        }
        if (s === 2) {
            for (const item of inspectionItems) {
                const ans = answers[item.id];
                if (!ans?.kondisi) return `Item "${item.nama_item}" belum dipilih.`;
                if (ans.kondisi === 'Tidak Layak' && !ans.keterangan.trim()) {
                    return `Keterangan wajib diisi untuk item "${item.nama_item}".`;
                }
            }
        }
        if (s === 4) {
            if (!kondisiAkhir) return 'Keputusan kondisi akhir unit wajib dipilih.';
            if (isOverride && !justifikasiKondisi.trim()) return 'Alasan keputusan wajib diisi karena berbeda dari rekomendasi sistem.';
            if (sigEmpty || sigPadRef.current?.isEmpty()) return 'Tanda tangan wajib dibuat.';
        }
        return null;
    };

    const goNext = () => {
        const err = validateStep(step);
        if (err) { toast.error(err); return; }
        setStep((s) => Math.min(s + 1, 4));
    };

    const goPrev = () => {
        setStep((s) => Math.max(s - 1, 1));
    };

    const handleSubmit = () => {
        const err = validateStep(4);
        if (err) { toast.error(err); return; }

        setSubmitting(true);
        const paraf = sigPadRef.current?.toDataURL('image/png') ?? '';

        // Tolak signature yang terlalu besar (> 2MB base64 ≈ ~1.5MB PNG)
        const MAX_SIG_BYTES = 2 * 1024 * 1024;
        if (paraf.length > MAX_SIG_BYTES) {
            setSubmitting(false);
            toast.error('Ukuran tanda tangan terlalu besar. Coba ulangi tanda tangan.');
            return;
        }

        const answersArray = inspectionItems.map((item) => ({
            inspection_item_id: item.id,
            kondisi: answers[item.id]!.kondisi,
            keterangan: answers[item.id]?.keterangan || null,
        }));

        clearDraft();

        router.post('/p2h', {
            unit_id: Number(selectedUnitId),
            job_site: jobSite || null,
            lokasi_kerja: lokasiKerja || null,
            km_awal: kmAwal ? Number(kmAwal) : null,
            hm_km_akhir: hmKmAkhir ? Number(hmKmAkhir) : null,
            shift,
            pic_approver_id: needsApproval && picApproverId ? Number(picApproverId) : null,
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
        }, {
            onSuccess: () => {
                router.visit('/p2h', { replace: true });
            },
            onError: (errors) => {
                setSubmitting(false);
                // Kembalikan draft jika submit gagal
                saveDraft({
                    step, selectedUnitId, jobSite, lokasiKerja, kmAwal, shift,
                    picApproverId,
                    answers, servisMingguan, servisBerkala, unscheduleBreakdown,
                    lainnya, lainnyaText, catatanServis, kmUnit, jumlahLiter,
                    hmKmAkhir, kondisiAkhir, justifikasiKondisi,
                });
                const messages = Object.values(errors);
                if (messages.length > 0) {
                    messages.forEach((msg) => toast.error(msg));
                } else {
                    toast.error('Terjadi kesalahan. Periksa form kembali.');
                }
            },
        });
    };

    const checklistProgress = Math.round((filledCount / inspectionItems.length) * 100);

    return (
        <>
            <Head title="Form P2H" />

            <div ref={topRef} className="flex min-h-screen flex-col pb-40 md:pb-20">

                {/* ── Sticky Top Header ── */}
                <div className="sticky top-0 z-20 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    {hasDraft && (
                        <div className="mb-2 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 dark:border-amber-900 dark:bg-amber-950/30">
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                                ✦ Draft tersimpan dilanjutkan secara otomatis
                            </p>
                            <button
                                type="button"
                                onClick={() => { clearDraft(); window.location.reload(); }}
                                className="ml-2 text-xs font-medium text-amber-600 underline hover:text-amber-800 dark:text-amber-400"
                            >
                                Mulai ulang
                            </button>
                        </div>
                    )}
                    <div className="mb-3">
                        <h1 className="text-base font-bold">Form P2H</h1>
                        <p className="text-xs text-muted-foreground">
                            {selectedUnit
                                ? `${selectedUnit.no_unit} · ${selectedUnit.jenis_unit}${slotInfo ? ` · Pengisian ke-${slotInfo.next_slot}` : ''}`
                                : 'Pemeriksaan & Perawatan Harian'}
                        </p>
                    </div>
                    <StepIndicator current={step} />
                </div>

                {/* ── Step Content ── */}
                <div className="flex flex-col gap-4 p-4">

                    {/* ══════════════════════════════════════════
                        STEP 1 — Unit & Shift
                    ══════════════════════════════════════════ */}
                    {step === 1 && (
                        <>
                            {/* Pilih Unit */}
                            <Card>
                                <CardHeader className="px-4 pb-0">
                                    <CardTitle className="text-base">Pilih Unit Kendaraan</CardTitle>
                                    <CardDescription>Pilih unit yang akan diperiksa hari ini</CardDescription>
                                </CardHeader>
                                <CardContent className="px-4 space-y-3">
                                    {/* Unit picker — Sheet bottom drawer */}
                                    {(() => {
                                        const pickedUnit = units.find((u) => String(u.id) === selectedUnitId);
                                        return (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => setUnitSheetOpen(true)}
                                                    className={cn(
                                                        'flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-colors',
                                                        pickedUnit
                                                            ? 'border-primary/30 bg-primary/5 hover:border-primary/50'
                                                            : 'border-dashed border-muted-foreground/30 bg-muted/30 hover:border-muted-foreground/50',
                                                    )}
                                                >
                                                    {pickedUnit ? (
                                                        <div className="flex min-w-0 items-center gap-3">
                                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                                                <Truck className="h-5 w-5 text-primary" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="truncate text-base font-bold">{pickedUnit.no_unit}</div>
                                                                <div className="text-xs text-muted-foreground">{pickedUnit.jenis_unit}</div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground">Ketuk untuk memilih unit kendaraan</span>
                                                    )}
                                                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                                                </button>

                                                <Sheet open={unitSheetOpen} onOpenChange={setUnitSheetOpen}>
                                                    <SheetContent side="bottom" className="max-h-[75vh] rounded-t-2xl pb-safe">
                                                        <SheetHeader className="pb-2">
                                                            <SheetTitle>Pilih Unit Kendaraan</SheetTitle>
                                                        </SheetHeader>
                                                        <div className="space-y-2 overflow-y-auto px-4 pb-4">
                                                            {units.map((unit) => {
                                                                const isSelected = String(unit.id) === selectedUnitId;
                                                                return (
                                                                    <SheetClose asChild key={unit.id}>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => { setSelectedUnitId(String(unit.id)); setPicApproverId(''); }}
                                                                            className={cn(
                                                                                'flex w-full items-center gap-4 rounded-xl border-2 px-4 py-3 text-left transition-colors',
                                                                                isSelected
                                                                                    ? 'border-primary bg-primary/5'
                                                                                    : 'border-border hover:border-primary/40 hover:bg-muted/40',
                                                                            )}
                                                                        >
                                                                            <div className={cn(
                                                                                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                                                                                isSelected ? 'bg-primary/15' : 'bg-muted',
                                                                            )}>
                                                                                <Truck className={cn('h-5 w-5', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                                                                            </div>
                                                                            <div className="min-w-0 flex-1">
                                                                                <div className="text-base font-bold">{unit.no_unit}</div>
                                                                                <div className="text-xs text-muted-foreground">{unit.jenis_unit}</div>
                                                                            </div>
                                                                            {isSelected && (
                                                                                <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                                                                            )}
                                                                        </button>
                                                                    </SheetClose>
                                                                );
                                                            })}
                                                        </div>
                                                    </SheetContent>
                                                </Sheet>
                                            </>
                                        );
                                    })()}

                                    {checkingSlot && (
                                        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Memeriksa ketersediaan slot…
                                        </div>
                                    )}

                                    {slotInfo && !checkingSlot && (
                                        (
                                            <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20">
                                                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                <AlertTitle className="text-green-800 dark:text-green-300">P2H Tersedia</AlertTitle>
                                                <AlertDescription className="text-xs text-green-700 dark:text-green-400">
                                                    Anda akan melakukan <strong>pengisian ke-{slotInfo.next_slot}</strong> hari ini{slotInfo.slot_terisi > 0 ? ` (${slotInfo.slot_terisi} pengisian sebelumnya)` : ''}
                                                </AlertDescription>
                                            </Alert>
                                        )
                                    )}
                                </CardContent>
                            </Card>

                            {/* Identitas Pengemudi */}
                            <Card>
                                <CardHeader className="px-4 pb-0">
                                    <CardTitle className="text-base">Identitas Pengemudi</CardTitle>
                                    <CardDescription>Data diambil otomatis dari akun Anda</CardDescription>
                                </CardHeader>
                                <CardContent className="px-4 space-y-0">
                                    <div className="flex items-center gap-3 py-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm text-muted-foreground">Nama</p>
                                            <p className="truncate text-base font-semibold">{auth?.user?.name ?? '-'}</p>
                                        </div>
                                    </div>
                                    <Separator />
                                    <div className="flex items-center gap-3 py-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                                            <Hash className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm text-muted-foreground">NIK</p>
                                            <p className="truncate text-base font-semibold">{auth?.user?.nik ?? '-'}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Job Site & Lokasi Kerja */}
                            <Card>
                                <CardHeader className="px-4 pb-0">
                                    <CardTitle className="text-base">Lokasi Pekerjaan</CardTitle>
                                    <CardDescription>Isi job site dan lokasi kerja (opsional)</CardDescription>
                                </CardHeader>
                                <CardContent className="px-4 space-y-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="job-site" className="text-sm font-medium">Job Site</Label>
                                        <Select value={jobSite} onValueChange={setJobSite}>
                                            <SelectTrigger id="job-site" className="h-11 text-sm w-full">
                                                <SelectValue placeholder="Pilih Job Site" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {jobSiteOptions.map((site) => (
                                                    <SelectItem key={site} value={site}>{site}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="lokasi-kerja" className="text-sm font-medium">Lokasi Kerja</Label>
                                        <Input
                                            id="lokasi-kerja"
                                            type="text"
                                            value={lokasiKerja}
                                            onChange={(e) => setLokasiKerja(e.target.value)}
                                            placeholder="Contoh: Pit 3, Hauling Road"
                                            className="h-11 text-sm"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* KM Awal & Shift */}
                            <Card>
                                <CardHeader className="px-4 pb-0">
                                    <div className="flex items-center gap-2">
                                        <Gauge className="h-4 w-4 text-muted-foreground" />
                                        <CardTitle className="text-base">HM/KM Awal</CardTitle>
                                    </div>
                                    <CardDescription>Lihat odometer/hourmeter kendaraan (opsional)</CardDescription>
                                </CardHeader>
                                <CardContent className="px-4 space-y-2">
                                    <Input
                                        id="km-awal"
                                        type="number"
                                        inputMode="numeric"
                                        min={0}
                                        value={kmAwal}
                                        onChange={(e) => setKmAwal(e.target.value)}
                                        placeholder="Contoh: 12500"
                                        className="h-14 text-xl font-bold tracking-wide"
                                    />
                                    {kmAwal && (
                                        <p className="text-xs text-muted-foreground">
                                            = {Number(kmAwal).toLocaleString('id-ID')}
                                        </p>
                                    )}
                                </CardContent>

                                <Separator className="mx-4 w-auto" />

                                <CardHeader className="px-4 pb-0 pt-0">
                                    <div className="flex items-center gap-2">
                                        <Sun className="h-4 w-4 text-muted-foreground" />
                                        <CardTitle className="text-base">Pilih Shift</CardTitle>
                                        <span className="text-destructive text-sm">*</span>
                                    </div>
                                    <CardDescription>Pilih shift kerja Anda saat ini</CardDescription>
                                </CardHeader>
                                <CardContent className="px-4">
                                    <ToggleGroup
                                        type="single"
                                        value={shift}
                                        onValueChange={(v) => { if (v) setShift(v); }}
                                        className={cn('grid w-full gap-2', shiftOptions.length === 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-3')}
                                    >
                                        {shiftOptions.map((s, i) => {
                                            const isDay = i === 0;
                                            const Icon = isDay ? Sun : Moon;
                                            return (
                                                <ToggleGroupItem
                                                    key={s}
                                                    value={s}
                                                    className={cn(
                                                        'h-20 flex-col gap-1.5 rounded-xl border-2 text-sm font-semibold',
                                                        isDay
                                                            ? 'data-[state=on]:border-amber-500 data-[state=on]:bg-amber-50 data-[state=on]:text-amber-700 dark:data-[state=on]:bg-amber-950/30 dark:data-[state=on]:text-amber-300'
                                                            : 'data-[state=on]:border-indigo-600 data-[state=on]:bg-indigo-50 data-[state=on]:text-indigo-700 dark:data-[state=on]:bg-indigo-950/30 dark:data-[state=on]:text-indigo-300',
                                                    )}
                                                >
                                                    <Icon className="h-6 w-6" />
                                                    {s}
                                                </ToggleGroupItem>
                                            );
                                        })}
                                    </ToggleGroup>
                                </CardContent>
                            </Card>
                        {/* PIC Approver — muncul untuk semua driver yang mengisi unit LV */}
                        {needsApproval && (
                            <Card className="border-amber-200 dark:border-amber-800">
                                <CardHeader className="px-4 pb-0">
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        <CardTitle className="text-base">PIC Persetujuan</CardTitle>
                                        <span className="text-destructive text-sm">*</span>
                                    </div>
                                    <CardDescription>
                                        P2H untuk unit Light Vehicle memerlukan persetujuan. Pilih {picJabatanLabel} yang akan memeriksa dan menandatangani form ini.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="px-4 space-y-2">
                                    <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/30">
                                        <p className="text-xs text-amber-700 dark:text-amber-300">
                                            PIC yang dipilih akan mendapat notifikasi dan wajib me-review serta menandatangani P2H Anda sebelum dinyatakan valid.
                                        </p>
                                    </div>
                                    {filteredStaffUsers.length === 0 ? (
                                        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm text-destructive">
                                            Tidak ada {picJabatanLabel} dari departemen <strong>{selectedUnit?.department}</strong> yang terdaftar. Hubungi admin untuk menambahkan PIC.
                                        </div>
                                    ) : (
                                        <PicCombobox
                                            staffUsers={filteredStaffUsers}
                                            value={picApproverId}
                                            onChange={setPicApproverId}
                                        />
                                    )}
                                    {picApproverId && (() => {
                                        const pic = staffUsers.find((s) => String(s.id) === picApproverId);
                                        return pic ? (
                                            <div className="flex items-center gap-2.5 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
                                                    <User className="h-4 w-4 text-primary" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold truncate">{pic.name}</p>
                                                    <p className="text-xs text-muted-foreground">{pic.jabatan}{pic.department ? ` · ${pic.department}` : ''}</p>
                                                </div>
                                            </div>
                                        ) : null;
                                    })()}
                                </CardContent>
                            </Card>
                        )}
                        </>
                    )}

                    {/* ══════════════════════════════════════════
                        STEP 2 — Checklist Pemeriksaan
                    ══════════════════════════════════════════ */}
                    {step === 2 && (
                        <>
                            {/* Progress */}
                            <Card>
                                <CardContent className="px-4 py-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-base font-semibold">Progress Pemeriksaan</p>
                                            <p className="text-sm text-muted-foreground">
                                                {filledCount} dari {inspectionItems.length} item sudah diperiksa
                                            </p>
                                        </div>
                                        <span className="text-2xl font-bold text-primary">{checklistProgress}%</span>
                                    </div>
                                    <Progress value={checklistProgress} className="h-3 rounded-full" />
                                    <div className="flex flex-wrap items-center gap-3 text-xs">
                                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                            <span className="h-2 w-2 rounded-full bg-green-500" />
                                            {filledCount - tlCount} Layak
                                        </span>
                                        {tlCount > 0 && (
                                            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                                <span className="h-2 w-2 rounded-full bg-red-500" />
                                                {tlCount} Tidak Layak
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1 text-muted-foreground">
                                            <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                                            {inspectionItems.length - filledCount} Belum
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Instruksi */}
                            <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900 dark:bg-blue-950/20">
                                <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    Periksa setiap komponen kendaraan, lalu pilih <strong>Layak</strong> atau{' '}
                                    <strong>Tidak Layak</strong>. Jika Tidak Layak, wajib isi keterangan.
                                </p>
                            </div>

                            {/* Checklist groups per seksi */}
                            <div className="space-y-2">
                                {SECTION_ORDER.map((section) => {
                                    const items = groupedItems[section];
                                    if (items.length === 0) return null;
                                    return (
                                        <ChecklistGroup
                                            key={section}
                                            section={section}
                                            items={items}
                                            answers={answers}
                                            onChange={handleKondisiChange}
                                            onKeteranganChange={handleKeteranganChange}
                                            defaultOpen={section === 'A'}
                                        />
                                    );
                                })}
                            </div>

                            {tlCount > 0 && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>{tlCount} Item Tidak Layak</AlertTitle>
                                    <AlertDescription className="text-xs">
                                        Pastikan keterangan sudah diisi untuk semua item yang ditandai Tidak Layak sebelum melanjutkan.
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
                                        <CardTitle className="text-base">Informasi Servis</CardTitle>
                                    </div>
                                    <CardDescription>Centang jika ada kegiatan servis hari ini (opsional)</CardDescription>
                                </CardHeader>
                                <CardContent className="px-4 space-y-3">
                                    <div className="space-y-2">
                                        {[
                                            { id: 'servis_mingguan', label: 'Servis Mingguan', desc: 'Servis rutin setiap minggu', value: servisMingguan, setter: setServisMingguan },
                                            { id: 'servis_berkala', label: 'Servis Berkala', desc: 'Servis per jarak tempuh / jam kerja', value: servisBerkala, setter: setServisBerkala },
                                            { id: 'unschedule', label: 'Unschedule / Break Down', desc: 'Servis darurat akibat kerusakan', value: unscheduleBreakdown, setter: setUnscheduleBreakdown },
                                        ].map((srv) => (
                                            <label
                                                key={srv.id}
                                                htmlFor={srv.id}
                                                className="flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors hover:bg-muted/40 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                                            >
                                                <Checkbox
                                                    id={srv.id}
                                                    checked={srv.value}
                                                    onCheckedChange={(v) => srv.setter(Boolean(v))}
                                                    className="mt-0.5 h-5 w-5"
                                                />
                                                <div>
                                                    <p className="text-base font-medium">{srv.label}</p>
                                                    <p className="text-sm text-muted-foreground">{srv.desc}</p>
                                                </div>
                                            </label>
                                        ))}

                                        {/* Lainnya */}
                                        <label
                                            htmlFor="lainnya"
                                            className="flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors hover:bg-muted/40 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                                        >
                                            <Checkbox
                                                id="lainnya"
                                                checked={lainnya}
                                                onCheckedChange={(v) => setLainnya(Boolean(v))}
                                                className="mt-0.5 h-5 w-5"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-base font-medium">Lainnya</p>
                                                <p className="text-sm text-muted-foreground">Servis jenis lain — sebutkan di bawah</p>
                                                {lainnya && (
                                                    <Input
                                                        value={lainnyaText}
                                                        onChange={(e) => setLainnyaText(e.target.value)}
                                                        placeholder="Sebutkan jenis servis lainnya…"
                                                        className="mt-2 h-10 w-full text-sm"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                )}
                                            </div>
                                        </label>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-sm font-medium">Catatan Servis</Label>
                                        <Textarea
                                            value={catatanServis}
                                            onChange={(e) => setCatatanServis(e.target.value)}
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
                                        <CardTitle className="text-base">Pengisian Bahan Bakar</CardTitle>
                                    </div>
                                    <CardDescription>
                                        Isi jika ada pengisian BBM hari ini. Biarkan kosong jika tidak ada.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="px-4 space-y-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="km-unit" className="text-sm font-medium">KM Saat Isi BBM</Label>
                                        <Input
                                            id="km-unit"
                                            type="number"
                                            inputMode="numeric"
                                            min={0}
                                            value={kmUnit}
                                            onChange={(e) => setKmUnit(e.target.value)}
                                            placeholder="Contoh: 12550"
                                            className="h-12 text-base"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="jumlah-liter" className="text-sm font-medium">Jumlah Liter</Label>
                                        <Input
                                            id="jumlah-liter"
                                            type="number"
                                            inputMode="decimal"
                                            min={0}
                                            step="0.01"
                                            value={jumlahLiter}
                                            onChange={(e) => setJumlahLiter(e.target.value)}
                                            placeholder="Contoh: 50.5"
                                            className="h-12 text-base"
                                        />
                                    </div>
                                    {kmUnit && jumlahLiter && (
                                        <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5">
                                            <Fuel className="h-4 w-4 shrink-0 text-muted-foreground" />
                                            <p className="text-xs text-muted-foreground">
                                                Pengisian <strong>{jumlahLiter} liter</strong> pada KM{' '}
                                                <strong>{Number(kmUnit).toLocaleString('id-ID')}</strong>
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
                                    <CardTitle className="text-base">Ringkasan Pemeriksaan</CardTitle>
                                    <CardDescription>Periksa kembali sebelum tanda tangan</CardDescription>
                                </CardHeader>
                                <CardContent className="px-4 space-y-0">
                                    {/* Unit & Driver */}
                                    <div className="rounded-xl bg-muted/40 px-3 py-1 mb-3">
                                        <SummaryRow icon={Truck}  label="Unit"         value={selectedUnit?.no_unit ?? '-'} />
                                        <Separator />
                                        <SummaryRow icon={Truck}  label="Jenis"        value={selectedUnit?.jenis_unit ?? '-'} />
                                        <Separator />
                                        <SummaryRow icon={User}   label="Pengemudi"    value={auth?.user?.name ?? '-'} />
                                        <Separator />
                                        <SummaryRow icon={Sun}    label="Shift"        value={shift} />
                                        {jobSite && <><Separator /><SummaryRow label="Job Site" value={jobSite} /></>}
                                        {lokasiKerja && <><Separator /><SummaryRow label="Lokasi Kerja" value={lokasiKerja} /></>}
                                        <Separator />
                                        <SummaryRow icon={Gauge}  label="HM/KM Awal"  value={kmAwal ? Number(kmAwal).toLocaleString('id-ID') : '-'} />
                                        {needsApproval && picApproverId && (() => {
                                            const pic = staffUsers.find((s) => String(s.id) === picApproverId);
                                            return pic ? (
                                                <><Separator /><SummaryRow icon={User} label="PIC Approval" value={`${pic.name} (${pic.jabatan})`} /></>
                                            ) : null;
                                        })()}
                                    </div>

                                    {/* Hasil Checklist */}
                                    <div className="space-y-1 mb-3">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 pb-1">Hasil Checklist</p>
                                        <div className="rounded-xl bg-muted/40 px-3 py-1">
                                            <div className="flex items-center gap-3 py-2">
                                                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                                                <span className="flex-1 text-sm text-muted-foreground">Item Layak</span>
                                                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300">
                                                    {filledCount - tlCount} / {inspectionItems.length}
                                                </Badge>
                                            </div>
                                            {tlCount > 0 && (
                                                <>
                                                    <Separator />
                                                    <div className="flex items-center gap-3 py-2">
                                                        <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                                                        <span className="flex-1 text-sm text-muted-foreground">Item Tidak Layak</span>
                                                        <Badge variant="destructive">{tlCount} item</Badge>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Servis & BBM — hanya jika ada */}
                                    {(servisMingguan || servisBerkala || unscheduleBreakdown || lainnya || kmUnit || jumlahLiter) && (
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 pb-1">Servis & BBM</p>
                                            <div className="rounded-xl bg-muted/40 px-3 py-1">
                                                {(servisMingguan || servisBerkala || unscheduleBreakdown || lainnya) && (
                                                    <SummaryRow
                                                        icon={Wrench}
                                                        label="Servis"
                                                        value={[
                                                            servisMingguan && 'Mingguan',
                                                            servisBerkala && 'Berkala',
                                                            unscheduleBreakdown && 'Breakdown',
                                                            lainnya && lainnyaText,
                                                        ].filter(Boolean).join(', ')}
                                                    />
                                                )}
                                                {(kmUnit || jumlahLiter) && (
                                                    <>
                                                        {(servisMingguan || servisBerkala || unscheduleBreakdown || lainnya) && <Separator />}
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
                                    <AlertTitle>{tlCount} Item Tidak Layak</AlertTitle>
                                    <AlertDescription className="text-xs">
                                        Ada item yang tidak layak. Pastikan sudah dilaporkan ke atasan / mekanik sebelum kendaraan dioperasikan.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Keputusan Kondisi Akhir */}
                            <Card className={cn(
                                'border-2',
                                kondisiAkhir === 'Layak Pakai' && 'border-emerald-400 dark:border-emerald-700',
                                kondisiAkhir === 'BD' && 'border-red-400 dark:border-red-700',
                                !kondisiAkhir && 'border-primary/30',
                            )}>
                                <CardHeader className="px-4 pb-0">
                                    <CardTitle className="text-base">
                                        Keputusan Kondisi Akhir Unit <span className="text-destructive">*</span>
                                    </CardTitle>
                                    <CardDescription>
                                        Nyatakan kondisi unit setelah Anda periksa. Anda memiliki wewenang penuh.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="px-4 space-y-4">
                                    {/* Rekomendasi sistem */}
                                    {recommendedKondisi && (
                                        <div className={cn(
                                            'flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium',
                                            recommendedKondisi === 'Layak Pakai'
                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                                                : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300',
                                        )}>
                                            {recommendedKondisi === 'Layak Pakai'
                                                ? <ShieldCheck className="h-4 w-4 shrink-0" />
                                                : <ShieldAlert className="h-4 w-4 shrink-0" />
                                            }
                                            <span>
                                                Rekomendasi P2H: <strong>{recommendedKondisi}</strong>
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
                                            onClick={() => { setKondisiAkhir('Layak Pakai'); if (kondisiAkhir === 'Layak Pakai') return; setJustifikasiKondisi(''); }}
                                            className={cn(
                                                'flex h-20 flex-col items-center justify-center gap-1.5 rounded-xl border-2 text-sm font-semibold transition-all duration-200',
                                                kondisiAkhir === 'Layak Pakai'
                                                    ? 'scale-[1.02] border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md dark:bg-emerald-950/30 dark:text-emerald-300'
                                                    : 'border-border bg-background text-muted-foreground hover:border-emerald-400 hover:text-emerald-600',
                                            )}
                                        >
                                            <ShieldCheck className="h-6 w-6" />
                                            Layak Pakai
                                            <span className="text-[10px] font-normal opacity-70">Unit siap beroperasi</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setKondisiAkhir('BD'); if (kondisiAkhir === 'BD') return; setJustifikasiKondisi(''); }}
                                            className={cn(
                                                'flex h-20 flex-col items-center justify-center gap-1.5 rounded-xl border-2 text-sm font-semibold transition-all duration-200',
                                                kondisiAkhir === 'BD'
                                                    ? 'scale-[1.02] border-red-500 bg-red-50 text-red-700 shadow-md dark:bg-red-950/30 dark:text-red-300'
                                                    : 'border-border bg-background text-muted-foreground hover:border-red-400 hover:text-red-600',
                                            )}
                                        >
                                            <ShieldAlert className="h-6 w-6" />
                                            BD / Tidak Layak
                                            <span className="text-[10px] font-normal opacity-70">Tidak dapat dioperasikan</span>
                                        </button>
                                    </div>

                                    {/* Justifikasi — wajib jika override */}
                                    {isOverride && (
                                        <div className="animate-in fade-in slide-in-from-top-2 space-y-1.5 duration-200">
                                            <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-950/30">
                                                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                                                <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                                                    Keputusan Anda berbeda dari rekomendasi sistem. Alasan wajib diisi.
                                                </p>
                                            </div>
                                            <Label className="text-sm font-medium">
                                                Alasan Keputusan <span className="text-destructive">*</span>
                                            </Label>
                                            <Textarea
                                                value={justifikasiKondisi}
                                                onChange={(e) => setJustifikasiKondisi(e.target.value.slice(0, 500))}
                                                placeholder="Jelaskan alasan keputusan Anda berbeda dari rekomendasi kalkulasi P2H…"
                                                className="min-h-[88px] resize-none text-sm"
                                                maxLength={500}
                                            />
                                            <p className="text-right text-xs text-muted-foreground">{justifikasiKondisi.length}/500</p>
                                        </div>
                                    )}

                                    {/* Catatan opsional — saat sesuai rekomendasi */}
                                    {kondisiAkhir && !isOverride && (
                                        <div className="space-y-1.5">
                                            <Label className="text-sm font-medium text-muted-foreground">Catatan Tambahan (opsional)</Label>
                                            <Textarea
                                                value={justifikasiKondisi}
                                                onChange={(e) => setJustifikasiKondisi(e.target.value.slice(0, 500))}
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
                                        <CardTitle className="text-base">HM/KM Akhir</CardTitle>
                                    </div>
                                    <CardDescription>Isi HM/KM saat selesai shift (opsional)</CardDescription>
                                </CardHeader>
                                <CardContent className="px-4 space-y-2">
                                    <Input
                                        id="hm-km-akhir"
                                        type="number"
                                        inputMode="numeric"
                                        min={0}
                                        value={hmKmAkhir}
                                        onChange={(e) => setHmKmAkhir(e.target.value)}
                                        placeholder="Contoh: 12700"
                                        className="h-14 text-xl font-bold tracking-wide"
                                    />
                                    {hmKmAkhir && (
                                        <p className="text-xs text-muted-foreground">
                                            = {Number(hmKmAkhir).toLocaleString('id-ID')}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Tanda Tangan */}
                            <Card>
                                <CardHeader className="px-4 pb-0">
                                    <div className="flex items-center gap-2">
                                        <PenLine className="h-4 w-4 text-muted-foreground" />
                                        <CardTitle className="text-base">Tanda Tangan Driver</CardTitle>
                                    </div>
                                    <CardDescription>
                                        Tanda tangani menggunakan jari atau mouse sebagai pernyataan bahwa pemeriksaan telah dilakukan dengan jujur dan benar.
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
                submitDisabled={submitting || sigEmpty}
                checklistProgress={step === 2 ? checklistProgress : undefined}
                filledCount={step === 2 ? filledCount : undefined}
                totalItems={step === 2 ? inspectionItems.length : undefined}
            />
        </>
    );
}

P2hForm.layout = {
    breadcrumbs: [{ title: 'Form P2H', href: '/p2h/form' }],
};
