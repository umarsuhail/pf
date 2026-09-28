"use client";

import { useSyncExternalStore } from "react";

// The flight's gearbox.
//
// Two inputs move the traveller — the wheel and the dial — and they used to
// disagree about how much ground one gesture covers, because each carried its
// own hard-coded answer. The gear is that answer, held in one place and read
// by both: how far a single scroll lands you, and how far one revolution of
// the bezel carries you. Changing gear changes the feel of the whole flight,
// not the behaviour of one control.
//
// Higher gear, more distance per gesture — a car's gearbox, not a volume
// knob. First is for looking out of the window; third is for getting there.
export type TravelGearId = 1 | 2 | 3;

export type TravelGear = {
  id: TravelGearId;
  // Spoken by screen readers and used for the tooltip. Deliberately plain
  // mechanical description: these are control labels, not narration.
  label: string;
  description: string;
  // How much bezel you have to turn to travel one section. 1080° is three
  // full revolutions — slow, fine, and with 108 detents to cross, the ring
  // reports the distance the whole way.
  degreesPerSection: number;
  // How many snap landings each section is divided into for the wheel.
  // 0 means the document does not snap at all: free travel, which is the
  // only way scrolling ever feels smooth.
  snapStepsPerSection: number;
  // Third gear lands on a stop when the ring is released. The other two
  // leave the traveller wherever they stopped, because stopping between two
  // places is the entire point of a low gear.
  settlesOnStops: boolean;
};

export const TRAVEL_GEARS: Record<TravelGearId, TravelGear> = {
  1: {
    id: 1,
    label: "First gear",
    description: "Free scrolling, fine dial. No landings.",
    degreesPerSection: 1080,
    snapStepsPerSection: 0,
    settlesOnStops: false,
  },
  2: {
    id: 2,
    label: "Second gear",
    description: "Three landings per section. One turn of the dial per section.",
    degreesPerSection: 360,
    snapStepsPerSection: 3,
    settlesOnStops: false,
  },
  3: {
    id: 3,
    label: "Third gear",
    description: "Section to section. One scroll, one panel.",
    degreesPerSection: 120,
    snapStepsPerSection: 1,
    settlesOnStops: true,
  },
};

export const TRAVEL_GEAR_IDS: TravelGearId[] = [1, 2, 3];

// Second is the default: the wheel still lands somewhere on purpose, but a
// section takes three of them rather than being one flick wide.
const DEFAULT_GEAR: TravelGearId = 2;
const STORAGE_KEY = "flight-travel-gear";

function isGearId(value: unknown): value is TravelGearId {
  return value === 1 || value === 2 || value === 3;
}

// A module singleton rather than context: the dial and the flight are in
// different branches of the tree and neither owns the other, and this is read
// during scroll handling where a context read would be one more subscription
// per frame.
let current: TravelGearId = DEFAULT_GEAR;
let restored = false;
const listeners = new Set<() => void>();

// Deferred until first read on the client. Reading localStorage during module
// evaluation would run during SSR-adjacent bundling and, worse, would make
// the first client snapshot differ from the server's and trip hydration.
function restore() {
  if (restored || typeof window === "undefined") return;
  restored = true;
  try {
    const stored = Number(window.localStorage.getItem(STORAGE_KEY));
    if (isGearId(stored)) current = stored;
  } catch {
    /* private mode, or storage blocked by policy — the default stands */
  }
}

export function getTravelGear(): TravelGear {
  return TRAVEL_GEARS[current];
}

export function setTravelGear(id: TravelGearId) {
  if (current === id) return;
  current = id;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(id));
  } catch {
    /* the gear still changes for this visit */
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  restore();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// The snapshot has to be the gear *id*, not the gear object: useSyncExternalStore
// compares snapshots by identity, and returning TRAVEL_GEARS[current] is only
// stable because those objects are frozen module constants — the id keeps that
// guarantee obvious rather than incidental.
function getSnapshot(): TravelGearId {
  restore();
  return current;
}

function getServerSnapshot(): TravelGearId {
  return DEFAULT_GEAR;
}

export function useTravelGear(): TravelGear {
  const id = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return TRAVEL_GEARS[id];
}
