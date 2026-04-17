export default function AppLogo() {
    return (
        <>
            <div className="flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                <img
                    src="/logo.png"
                    alt="PIMS Logo"
                    className="size-8 object-contain"
                />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold tracking-wide">PIMS</span>
                <span className="text-sidebar-foreground/50 truncate text-[10px] font-medium">
                    P2H &amp; Inspection System
                </span>
            </div>
        </>
    );
}
