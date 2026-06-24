import { useEffect, useState } from 'react';

export function useVisualViewport() {
    const [height, setHeight] = useState(() => window.visualViewport?.height ?? window.innerHeight);

    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;
        const handler = () => setHeight(vv.height);
        vv.addEventListener('resize', handler);
        return () => vv.removeEventListener('resize', handler);
    }, []);

    return height;
}
