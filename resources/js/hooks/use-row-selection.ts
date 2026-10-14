import { useState } from 'react';

/** Pilihan baris pada satu halaman tabel; dikosongkan saat data halaman berganti. */
export function useRowSelection(ids: number[]) {
    const key = ids.join(',');
    // Pilihan disimpan bersama kunci halaman; kunci berbeda → pilihan dianggap kosong
    const [state, setState] = useState<{ key: string; ids: number[] }>({
        key,
        ids: [],
    });
    const selected = state.key === key ? state.ids : [];
    const setSelected = (next: number[]) => setState({ key, ids: next });

    const allSelected = ids.length > 0 && selected.length === ids.length;

    return {
        selected,
        allSelected,
        someSelected: selected.length > 0 && !allSelected,
        isSelected: (id: number) => selected.includes(id),
        toggle: (id: number) =>
            setSelected(
                selected.includes(id)
                    ? selected.filter((x) => x !== id)
                    : [...selected, id],
            ),
        toggleAll: () => setSelected(allSelected ? [] : ids),
        clear: () => setSelected([]),
    };
}
