<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Traits\HasRoles;

#[Fillable(['name', 'nik', 'email', 'password', 'jabatan', 'department', 'jenis_unit', 'site_id'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, Notifiable, TwoFactorAuthenticatable;

    public function units(): BelongsToMany
    {
        return $this->belongsToMany(Unit::class, 'user_unit');
    }

    /** Determine whether this user may submit/read live P2H data for a unit. */
    public function canAccessP2hUnit(Unit $unit): bool
    {
        if ($unit->trashed() || $unit->status !== 'active') {
            return false;
        }

        if ($unit->site_id !== null && ! $unit->site()->active()->exists()) {
            return false;
        }

        if (! $this->hasAnyRole(['admin', 'manager', 'driver'])) {
            return false;
        }

        if ($this->isPrivileged()) {
            return true;
        }

        $hasAssignments = $this->units()->active()->exists();

        if ($hasAssignments) {
            return $this->units()->whereKey($unit->id)->exists();
        }

        if ($this->site_id !== null && $unit->site_id !== $this->site_id) {
            return false;
        }

        if ($this->site_id === null && $this->jenis_unit === null) {
            return false;
        }

        return $this->jenis_unit === null || $unit->jenis_unit === $this->jenis_unit;
    }

    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    /** Jabatan yang berlaku, urut dari tertinggi. */
    public const JABATAN_APPROVAL = 'Approval';

    public const JABATAN_USER_LV2 = 'User LV 2';

    public const JABATAN_USER_LV1 = 'User LV 1';

    public const JABATANS = [self::JABATAN_APPROVAL, self::JABATAN_USER_LV2, self::JABATAN_USER_LV1];

    /** User memiliki jabatan Approval atau User LV 2 (akses monitoring departemen) */
    public function isStaff(): bool
    {
        return in_array($this->jabatan, [self::JABATAN_APPROVAL, self::JABATAN_USER_LV2], true);
    }

    /** User memiliki jabatan Approval — satu-satunya jabatan yang boleh menjadi PIC approval LV */
    public function isApprover(): bool
    {
        return $this->jabatan === self::JABATAN_APPROVAL;
    }

    /** Driver yang submit P2H LV harus melalui approval (semua kecuali jabatan Approval) */
    public function needsLvApproval(): bool
    {
        return ! $this->isApprover();
    }

    /**
     * User dengan hak akses penuh: admin atau manager.
     * Gunakan ini sebagai ganti hasAnyRole(['admin', 'manager']) yang tersebar.
     */
    public function isPrivileged(): bool
    {
        return $this->hasAnyRole(['admin', 'manager']);
    }

    /**
     * User boleh memproses approval P2H LV:
     * driver jabatan Approval sebagai PIC, atau admin/manager untuk override.
     */
    public function canApproveLv(): bool
    {
        return $this->isPrivileged() || ($this->hasRole('driver') && $this->isApprover());
    }

    /**
     * User boleh membuka Monitoring PA & Monitoring P2H:
     * driver jabatan Approval/User LV 2 (dept sendiri), atau admin/manager.
     */
    public function canViewMonitoring(): bool
    {
        return $this->isPrivileged() || ($this->hasRole('driver') && $this->isStaff());
    }

    /**
     * User adalah Approval/User LV 2 murni (bukan admin/manager).
     * Dipakai untuk membatasi scope data yang bisa dilihat (hanya dept sendiri).
     */
    public function isStaffOnly(): bool
    {
        return $this->isStaff() && ! $this->isPrivileged();
    }

    /**
     * Override default behavior: jika email null, kembalikan string kosong
     * agar Fortify tidak mencoba menyimpan null sebagai primary key di password_reset_tokens.
     */
    public function getEmailForPasswordReset(): string
    {
        return $this->email ?? '';
    }

    public function sendPasswordResetNotification($token): void
    {
        if (empty($this->email)) {
            return;
        }

        parent::sendPasswordResetNotification($token);
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }
}
