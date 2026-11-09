import { execSync } from 'node:child_process';

const DATABASE = 'pims_visual';

export default function globalSetup() {
    const env = { ...process.env, DB_DATABASE: DATABASE };
    const run = (command: string) =>
        execSync(command, { env, encoding: 'utf8' });

    // Pengaman: migrate:fresh menghapus semua tabel, jadi target harus dipastikan dulu.
    const target = run(
        'php artisan tinker --execute="echo config(\'database.connections.mysql.database\');"',
    ).trim();

    if (!target.endsWith(DATABASE)) {
        throw new Error('E2E dibatalkan: target database adalah ' + target);
    }

    run('php artisan migrate:fresh --seed --force');
    run('php artisan db:seed --class=DemoSeeder --force');
}
