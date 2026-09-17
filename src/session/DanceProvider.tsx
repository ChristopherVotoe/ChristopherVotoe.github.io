"use client";

import { createContext, useContext, useRef } from "react";
import { useDanceSession } from "./useDanceSession";

type DanceContextValue = { session: ReturnType<typeof useDanceSession>; stream: React.RefObject<MediaStream | null> };
const DanceContext = createContext<DanceContextValue | null>(null);

export function DanceProvider({ children }: { children: React.ReactNode }) {
  const stream = useRef<MediaStream | null>(null);
  const session = useDanceSession(stream);
  return <DanceContext.Provider value={{ session, stream }}>{children}</DanceContext.Provider>;
}

export function useDance() {
  const value = useContext(DanceContext);
  if (!value) throw new Error("DanceProvider is required.");
  return value;
}
