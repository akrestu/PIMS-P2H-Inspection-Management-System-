import { useFlashToast } from '@/hooks/use-flash-toast';

/**
 * Mounts inside the Inertia component tree (via AppLayout) so that
 * usePage() — called inside useFlashToast — has access to the page context.
 * Renders nothing; side-effect only.
 */
export function FlashToastListener() {
    useFlashToast();
    return null;
}
