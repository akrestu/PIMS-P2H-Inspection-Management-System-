<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Traits\HasRoles;

#[Fillable(['name', 'nik', 'email', 'password'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable, HasRoles;

    public function driver(): HasOne
    {
        return $this->hasOne(Driver::class);
    }

    /**
     * Override default behavior: jika email null, kembalikan string kosong
     * agar Fortify tidak mencoba menyimpan null sebagai primary key di password_reset_tokens.
     * User tanpa email tidak bisa menggunakan fitur lupa password via email.
     */
    public function getEmailForPasswordReset(): string
    {
        return $this->email ?? '';
    }

    /**
     * Tentukan apakah user ini bisa menerima link reset password.
     * User tanpa email dikecualikan dari alur reset password.
     */
    public function sendPasswordResetNotification($token): void
    {
        if (empty($this->email)) {
            return;
        }

        parent::sendPasswordResetNotification($token);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }
}
