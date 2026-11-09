<?php

use App\Models\Site;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('nama site pengguna dibagikan ke shell', function () {
    $site = Site::create(['name' => 'Pit Uji', 'status' => 'active']);
    $user = User::factory()->create(['site_id' => $site->id]);

    $this->actingAs($user)->get('/settings/profile')->assertInertia(
        fn (Assert $page) => $page->where('auth.user.site_name', 'Pit Uji')
    );
});

test('pengguna tanpa site mendapat nama site kosong', function () {
    $user = User::factory()->create(['site_id' => null]);

    $this->actingAs($user)->get('/settings/profile')->assertInertia(
        fn (Assert $page) => $page->where('auth.user.site_name', null)
    );
});
