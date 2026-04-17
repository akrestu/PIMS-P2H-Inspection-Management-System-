<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            'name'     => $this->nameRules(),
            'nik'      => ['required', 'string', 'max:20', Rule::unique(User::class)],
            'email'    => $this->emailRules(),
            'password' => $this->passwordRules(),
        ])->validate();

        return User::create([
            'name'     => $input['name'],
            'nik'      => $input['nik'],
            'email'    => $input['email'],
            'password' => $input['password'],
        ]);
    }
}
