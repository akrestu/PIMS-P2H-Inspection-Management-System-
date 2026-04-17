export interface Unit {
    id: number;
    no_unit: string;
    jenis_unit: 'Bus' | 'Light Vehicle';
    no_lambung: string | null;
    status: 'active' | 'inactive';
    created_at?: string;
    updated_at?: string;
}

export interface Driver {
    id: number;
    user_id: number;
    nik: string;
    nama: string;
    department: string;
    jenis_unit: 'Bus' | 'Light Vehicle' | null;
    user?: {
        id: number;
        name: string;
        email: string;
    };
}

export interface P2hInspectionItem {
    id: number;
    nama_item: string;
    risiko: 'Critical' | 'Tinggi' | 'Sedang' | 'Rendah';
    urutan: number;
    is_active: boolean;
}

export interface P2hChecklistAnswer {
    id: number;
    p2h_user_entry_id: number;
    inspection_item_id: number;
    kondisi: 'Layak' | 'Tidak Layak';
    keterangan: string | null;
    inspection_item?: P2hInspectionItem;
}

export interface P2hFuelLog {
    id: number;
    p2h_user_entry_id: number;
    km_unit: number | null;
    jumlah_liter: number | null;
}

export interface P2hUserEntry {
    id: number;
    p2h_session_id: number;
    user_id: number;
    user_slot: number;
    km_awal: number | null;
    paraf_url: string | null;
    shift: 'Shift I' | 'Shift II' | null;
    submitted_at: string | null;
    user?: {
        id: number;
        name: string;
        driver?: Driver;
    };
    answers?: P2hChecklistAnswer[];
    fuel_log?: P2hFuelLog;
    kondisi_akhir?: 'Layak Pakai' | 'BD' | null;
    justifikasi_kondisi?: string | null;
    is_override?: boolean;
}

export interface P2hServiceInfo {
    id: number;
    p2h_session_id: number;
    servis_mingguan: boolean;
    servis_berkala: boolean;
    unschedule_breakdown: boolean;
    lainnya: string | null;
    catatan_servis: string | null;
}

export interface P2hSession {
    id: number;
    unit_id: number;
    tanggal: string;
    catatan_khusus: string | null;
    status: 'open' | 'completed';
    created_by: number;
    unit?: Unit;
    user_entries?: P2hUserEntry[];
    service_info?: P2hServiceInfo;
}

export interface PimsNotification {
    id: string;
    type: string;
    notifiable_id: number;
    data: {
        session_id: number;
        no_unit: string;
        driver_name: string;
        submitted_at: string;
        critical_items: Array<{
            nama_item: string;
            keterangan: string | null;
        }>;
    };
    read_at: string | null;
    created_at: string;
}

// Answer state for form
export interface AnswerState {
    inspection_item_id: number;
    kondisi: 'Layak' | 'Tidak Layak' | null;
    keterangan: string;
}
