import { useSyncExternalStore } from 'react';

/**
 * Tema PIMS (docs/01-design-tokens.md):
 *   `<html data-theme="light|dark|hc">`, pilihan disimpan per perangkat
 *   di localStorage `pims.theme` (+ cookie `appearance` agar Blade bisa
 *   menulis atribut sebelum paint).
 */
export type ResolvedAppearance = 'light' | 'dark' | 'hc';
export type Appearance = ResolvedAppearance | 'system';
export type MotionPreference = 'system' | 'reduced';

export type UseAppearanceReturn = {
    readonly appearance: Appearance;
    readonly resolvedAppearance: ResolvedAppearance;
    readonly updateAppearance: (mode: Appearance) => void;
};

const STORAGE_KEY = 'pims.theme';
const LEGACY_STORAGE_KEY = 'appearance';
const MOTION_KEY = 'pims.motion';
const APPEARANCES: Appearance[] = ['light', 'dark', 'hc', 'system'];

const listeners = new Set<() => void>();
let currentAppearance: Appearance = 'system';
let currentMotion: MotionPreference = 'system';

const prefersDark = (): boolean => {
    if (typeof window === 'undefined') {
        return false;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const setCookie = (name: string, value: string, days = 365): void => {
    if (typeof document === 'undefined') {
        return;
    }

    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
};

const safeGet = (key: string): string | null => {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
};

const safeSet = (key: string, value: string): void => {
    try {
        localStorage.setItem(key, value);
    } catch {
        // storage diblokir (mode privat) — abaikan, cookie tetap menyimpan tema
    }
};

const getStoredAppearance = (): Appearance => {
    const stored = safeGet(STORAGE_KEY) ?? safeGet(LEGACY_STORAGE_KEY);

    return APPEARANCES.includes(stored as Appearance)
        ? (stored as Appearance)
        : 'system';
};

const resolve = (appearance: Appearance): ResolvedAppearance => {
    if (appearance === 'system') {
        return prefersDark() ? 'dark' : 'light';
    }

    return appearance;
};

const applyTheme = (appearance: Appearance): void => {
    if (typeof document === 'undefined') {
        return;
    }

    const resolved = resolve(appearance);
    const root = document.documentElement;

    root.dataset.theme = resolved;
    root.style.colorScheme = resolved === 'dark' ? 'dark' : 'light';
};

const applyMotion = (motion: MotionPreference): void => {
    if (typeof document === 'undefined') {
        return;
    }

    if (motion === 'reduced') {
        document.documentElement.dataset.motion = 'reduced';
    } else {
        delete document.documentElement.dataset.motion;
    }
};

const subscribe = (callback: () => void) => {
    listeners.add(callback);

    return () => listeners.delete(callback);
};

const notify = (): void => listeners.forEach((listener) => listener());

const handleSystemThemeChange = (): void => {
    applyTheme(currentAppearance);
    notify();
};

export function initializeTheme(): void {
    if (typeof window === 'undefined') {
        return;
    }

    currentAppearance = getStoredAppearance();
    safeSet(STORAGE_KEY, currentAppearance);
    setCookie('appearance', currentAppearance);
    applyTheme(currentAppearance);

    currentMotion = safeGet(MOTION_KEY) === 'reduced' ? 'reduced' : 'system';
    applyMotion(currentMotion);

    window
        .matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', handleSystemThemeChange);
}

export function useAppearance(): UseAppearanceReturn {
    const appearance: Appearance = useSyncExternalStore(
        subscribe,
        () => currentAppearance,
        () => 'system',
    );

    const updateAppearance = (mode: Appearance): void => {
        currentAppearance = mode;
        safeSet(STORAGE_KEY, mode);
        setCookie('appearance', mode);
        applyTheme(mode);
        notify();
    };

    return {
        appearance,
        resolvedAppearance: resolve(appearance),
        updateAppearance,
    } as const;
}

/** Toggle "kurangi gerakan" (docs/03) — menambah `data-motion="reduced"` di `<html>`. */
export function useMotionPreference() {
    const motion: MotionPreference = useSyncExternalStore(
        subscribe,
        () => currentMotion,
        () => 'system',
    );

    const updateMotion = (value: MotionPreference): void => {
        currentMotion = value;
        safeSet(MOTION_KEY, value);
        applyMotion(value);
        notify();
    };

    return { motion, updateMotion } as const;
}
