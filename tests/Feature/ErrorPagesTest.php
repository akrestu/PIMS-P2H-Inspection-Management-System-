<?php

test('halaman 404 memakai tampilan PIMS berbahasa Indonesia', function () {
    $this->get('/halaman-yang-tidak-ada')
        ->assertNotFound()
        ->assertSee('Halaman tidak ditemukan')
        ->assertSee('Kembali ke beranda');
});
