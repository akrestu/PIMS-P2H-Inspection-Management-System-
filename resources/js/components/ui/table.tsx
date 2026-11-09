import { cn } from '@/lib/utils';

function Table({ className, ...props }: React.ComponentProps<'table'>) {
    return (
        <div className="relative w-full overflow-auto">
            <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
        </div>
    );
}

/**
 * Wadah tabel PIMS (docs/02#datatable): kartu putih radius 20 tanpa garis (docs/13), scroll horizontal di wadahnya.
 * Pakai bila halaman belum membungkus tabel dalam kartu.
 */
function TableContainer({ className, ...props }: React.ComponentProps<'div'>) {
    return <div className={cn('overflow-hidden rounded-xl bg-card shadow-sm', className)} {...props} />;
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
    return <thead className={cn('[&_tr]:border-b [&_tr]:hover:bg-transparent', className)} {...props} />;
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
    return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
    return <tfoot className={cn('bg-muted/50 border-t font-medium [&>tr]:last:border-b-0', className)} {...props} />;
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
    return (
        <tr
            className={cn('hover:bg-muted-2 data-[state=selected]:bg-brand-soft border-b transition-colors duration-150', className)}
            {...props}
        />
    );
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
    return (
        <th
            className={cn('text-muted-foreground h-11 px-4 text-left align-middle text-[13px] font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]', className)}
            {...props}
        />
    );
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
    return (
        <td
            className={cn('h-14 px-4 py-3 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]', className)}
            {...props}
        />
    );
}

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
    return <caption className={cn('text-muted-foreground mt-4 text-sm', className)} {...props} />;
}

export { Table, TableContainer, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
