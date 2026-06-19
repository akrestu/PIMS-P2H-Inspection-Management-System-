export type Jabatan = 'Sr.Staff' | 'Staff' | 'Non Staff';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Unit {
    id: number;
    no_unit: string;
    jenis_unit: 'Bus' | 'Light Vehicle';
    no_lambung: string | null;
    status: 'active' | 'inactive';
    department: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface UserProfile {
    id: number;
    name: string;
    nik: string | null;
    email: string | null;
    jabatan: Jabatan | null;
    department: string | null;
    jenis_unit: string | null;
    roles: string[];
    units?: Pick<Unit, 'id' | 'no_unit' | 'jenis_unit'>[];
}

export interface P2hInspectionItem {
    id: number;
    nama_item: string;
    section: 'A' | 'B' | 'C';
    kode_bahaya: 'AA' | 'A';
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
    lokasi_kerja: string | null;
    km_awal: number | null;
    hm_km_akhir: number | null;
    paraf_url: string | null;
    shift: 'Shift I' | 'Shift II' | null;
    submitted_at: string | null;
    kondisi_akhir: 'Layak Pakai' | 'BD' | null;
    justifikasi_kondisi: string | null;
    is_override?: boolean;
    // Approval
    approval_status: ApprovalStatus | null;
    pic_approver_id: number | null;
    approver_id: number | null;
    approved_at: string | null;
    catatan_approval: string | null;
    approver_signature_url: string | null;
    user?: Pick<UserProfile, 'id' | 'name' | 'nik' | 'jabatan' | 'department'>;
    approver?: Pick<UserProfile, 'id' | 'name'>;
    pic?: Pick<UserProfile, 'id' | 'name' | 'jabatan'>;
    answers?: P2hChecklistAnswer[];
    fuel_log?: P2hFuelLog;
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
    job_site: string | null;
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
        type?: string;
        // CriticalItemAlert
        session_id?: number;
        no_unit?: string;
        driver_name?: string;
        submitted_at?: string;
        critical_items?: Array<{ nama_item: string; keterangan: string | null }>;
        // LvP2hApprovalRequest / LvP2hApprovalResult
        entry_id?: number;
        submitter?: string;
        shift?: string;
        tanggal?: string;
        status?: ApprovalStatus;
        approver?: string;
        catatan?: string | null;
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
