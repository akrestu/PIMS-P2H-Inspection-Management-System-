import { useEffect, useState } from 'react';

const THRESHOLD = 8;

export function useScrollDirection(): 'up' | 'down' {
    const [direction, setDirection] = useState<'up' | 'down'>('up');

    useEffect(() => {
        const el = document.getElementById('main-scroll-area');
        if (!el) return;
        let lastY = el.scrollTop;

        const onScroll = () => {
            const currentY = el.scrollTop;
            if (Math.abs(currentY - lastY) < THRESHOLD) return;
            setDirection(currentY > lastY ? 'down' : 'up');
            lastY = currentY;
        };

        el.addEventListener('scroll', onScroll, { passive: true });
        return () => el.removeEventListener('scroll', onScroll);
    }, []);

    return direction;
}
