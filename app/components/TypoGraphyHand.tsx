"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

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

        paths.forEach((path) => {
            const length = path.getTotalLength();

            gsap.set(path, {
                strokeDasharray: length,
                strokeDashoffset: length,
                fill: "none",
            });

            gsap.to(path, {
                strokeDashoffset: 0,
                duration: 2,
                ease: "none",
            });
        });
    }, []);

    return (
        <div ref={containerRef} className={className}>
            {children}
        </div>
    );
}