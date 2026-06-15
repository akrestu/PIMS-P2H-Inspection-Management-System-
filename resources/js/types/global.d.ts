import type { Auth } from '@/types/auth';

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            contact: { wa_number: string };
            options: { job_sites: string[]; shifts: string[]; session_lifetime_minutes: number };
            [key: string]: unknown;
        };
    }
}
