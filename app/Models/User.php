<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Traits\HasRoles;

#[Fillable(['name', 'nik', 'email', 'password', 'jabatan', 'department', 'jenis_unit'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable, HasRoles;

    public function units(): BelongsToMany
    {
        return $this->belongsToMany(Unit::class, 'user_unit');
    }

    /** User memiliki jabatan Staff atau Sr.Staff */
    public function isStaff(): bool
    {
        return in_array($this->jabatan, ['Staff', 'Sr.Staff'], true);
    }

    /** User memiliki jabatan Non Staff */
    public function isNonStaff(): bool
    {
        return $this->jabatan === 'Non Staff';
    }

    /** Driver jabatan Sr.Staff tidak perlu memilih PIC saat mengisi P2H LV */
    public function isSrStaff(): bool
    {
        return $this->jabatan === 'Sr.Staff';
    }

    /** Driver yang submit P2H LV harus melalui approval (semua kecuali Sr.Staff) */
    public function needsLvApproval(): bool
    {
        return ! $this->isSrStaff();
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
     * User boleh mengakses fitur approval P2H LV:
     * Staff/Sr.Staff sebagai PIC, atau admin/manager untuk override.
     */
    public function canViewApprovals(): bool
    {
        return $this->isStaff() || $this->isPrivileged();
    }

    /**
     * User adalah Staff/Sr.Staff murni (bukan admin/manager).
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
            'email_verified_at'       => 'datetime',
            'password'                => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }
}
