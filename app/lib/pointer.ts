"use client";

import { useEffect, useState } from "react";

export const COARSE_POINTER_QUERY = "(pointer: coarse)";

export function isCoarsePointer() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(COARSE_POINTER_QUERY).matches;
}

export function useCoarsePointer() {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia(COARSE_POINTER_QUERY);
    const update = () => setCoarse(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return coarse;
}
