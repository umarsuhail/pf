import { ReactNode } from "react";
const TEAL = "#13553f";
const INDIGO = "#002a69";

export function ModernMain({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <section
            className="space-y-[3.5mm]"
            style={{ breakInside: "avoid-page", pageBreakInside: "avoid" }}
        >
            <h2 className="border-b-[2px] border-b-[#161e2e] border-l-[3px] border-l-[#161e2e] pb-[1.5mm] pl-[2mm] font-black uppercase tracking-[0.14em] text-[#161e2e]" style={{ fontSize: 'var(--fs-heading)' }}>
                {title}
            </h2>
            {children}
        </section>
    );
}
export function AtsSection({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <section
            className="space-y-[3.5mm]"
            style={{ breakInside: "avoid-page", pageBreakInside: "avoid" }}
        >
            <h2 className="border-b border-b-slate-300 border-l-[3px] border-l-slate-700 pb-[1.5mm] pl-[2.5mm] font-black uppercase tracking-[0.16em] text-slate-900" style={{ fontSize: 'var(--fs-heading)' }}>
                {title}
            </h2>
            {children}
        </section>
    );
}
export function ModernSidebar({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <section
            className="space-y-[3.5mm]"
            style={{ breakInside: "avoid-page", pageBreakInside: "avoid" }}
        >
            <h2 className="border-b border-b-[#161e2e]/20 border-l-[3px] border-l-[#161e2e] pb-[1.5mm] pl-[2mm] font-black uppercase tracking-[0.14em] text-[#161e2e]" style={{ fontSize: 'var(--fs-label)' }}>
                {title}
            </h2>
            {children}
        </section>
    );
}
export function CSection({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="space-y-[2mm]" style={{ breakInside: "avoid-page", pageBreakInside: "avoid" }}>
            <div className="flex items-center gap-[2mm]">
                <h2 className="font-black uppercase tracking-[0.22em] text-slate-800 whitespace-nowrap" style={{ fontSize: "var(--fs-heading)" }}>{title}</h2>
                <div className="h-px flex-1 bg-slate-300" />
            </div>
            {children}
        </section>
    );
}
export function ExSection({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="space-y-[3mm]" style={{ breakInside: "avoid-page", pageBreakInside: "avoid" }}>
            <div className="flex items-center gap-[2.5mm]">
                <div style={{ width: "4px", minWidth: "4px", height: "14px", background: TEAL, borderRadius: "2px" }} />
                <h2 className="font-black uppercase tracking-[0.18em] text-slate-900" style={{ fontSize: "var(--fs-heading)" }}>{title}</h2>
            </div>
            <div className="h-px bg-slate-200" />
            {children}
        </section>
    );
}
export function ALSection({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="space-y-[2.5mm]" style={{ breakInside: "avoid-page", pageBreakInside: "avoid" }}>
            <div style={{ borderLeft: `3px solid ${INDIGO}`, paddingLeft: "2.5mm" }}>
                <h2 className="font-black uppercase tracking-[0.18em] text-slate-900" style={{ fontSize: "var(--fs-heading)" }}>{title}</h2>
            </div>
            <div className="h-px bg-slate-200" />
            {children}
        </section>
    );
}