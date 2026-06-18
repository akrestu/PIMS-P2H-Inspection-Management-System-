import { useClipboard } from '@/hooks/use-clipboard';
import { toast } from 'sonner';

export function useWhatsAppShare() {
    const [, copy] = useClipboard();

    const share = async (message: string) => {
        const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
        const newWindow = window.open(url, '_blank', 'noopener,noreferrer');

        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            const success = await copy(message);
            if (success) {
                toast.success('Pesan disalin ke clipboard', {
                    description: 'Tempelkan di WhatsApp secara manual.',
                });
            } else {
                toast.error('Gagal membuka WhatsApp', {
                    description: 'Coba buka wa.me secara manual.',
                });
            }
        }
    };

    return { share };
}
