"use client";

import { useLayoutEffect, useRef } from "react";
import { animate } from "motion/react";

type HandwritingProps = {
    children: React.ReactNode;
    className?: string;
};

export default function Handwriting({
    children,
    className = "",
}: HandwritingProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (!containerRef.current) return;

        const paths =
            containerRef.current.querySelectorAll<SVGPathElement>("path");

        const controls = Array.from(paths).map((path) => {
            const length = path.getTotalLength();

            path.style.strokeDasharray = `${length}`;
            path.style.strokeDashoffset = `${length}`;
            path.style.fill = "none";

            return animate(
                path,
                { strokeDashoffset: 0 },
                { duration: 2, ease: "linear" },
            );
        });

        return () => controls.forEach((c) => c.stop());
    }, []);

    return (
        <div ref={containerRef} className={className}>
            {children}
        </div>
    );
}
