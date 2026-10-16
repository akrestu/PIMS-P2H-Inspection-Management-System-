import * as React from 'react';

import { inputClassName } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
    return (
        <textarea
            data-slot="textarea"
            className={cn(inputClassName, 'min-h-24 py-3', className)}
            {...props}
        />
    );
}

export { Textarea };
