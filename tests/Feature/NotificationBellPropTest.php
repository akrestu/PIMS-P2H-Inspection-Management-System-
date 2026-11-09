<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('daftar notifikasi lonceng tetap array pada permintaan kedua dari cache', function () {
    $user = User::factory()->create();

    foreach ([1, 2] as $visit) {
        $response = $this->actingAs($user)->get('/settings/profile');

        $response->assertInertia(fn (Assert $page) => $page->has('notification_bell.recent', 0));
        expect($response->viewData('page')['props']['notification_bell']['recent'])->toBeArray();
    }
});

test('halaman notifikasi tidak menimpa data lonceng', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get('/notifications')->assertInertia(
        fn (Assert $page) => $page->has('notification_bell.unread_count')
    );
});
