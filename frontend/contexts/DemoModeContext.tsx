"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type Persona = "creator" | "agency_creators" | "agency_businesses";

interface Ctx {
  isDemoMode: boolean;
  demoPersona: Persona | null;
  simulateNewActivity: () => Promise<void>;
  resetDemo: () => Promise<void>;
  setDemoState: (on: boolean, persona: Persona | null) => void;
}

const DemoModeContext = createContext<Ctx | undefined>(undefined);

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoPersona, setDemoPersona] = useState<Persona | null>(null);

  useEffect(() => {
    // hydrate from localStorage if present
    if (typeof window === "undefined") return;
    const on = localStorage.getItem("demo_mode") === "1";
    const persona = (localStorage.getItem("demo_persona") as Persona | null) || null;
    setIsDemoMode(on);
    setDemoPersona(persona);
  }, []);

  const setDemoState = useCallback((on: boolean, persona: Persona | null) => {
    setIsDemoMode(on);
    setDemoPersona(persona);
    if (typeof window !== "undefined") {
      localStorage.setItem("demo_mode", on ? "1" : "0");
      if (persona) localStorage.setItem("demo_persona", persona);
    }
  }, []);

  const simulateNewActivity = useCallback(async () => {
    try {
      await api.post("/demo/simulate-activity");
    } catch (e) {
      // non-fatal in demo
      console.warn("simulateNewActivity failed", e);
    }
  }, []);

  const resetDemo = useCallback(async () => {
    try {
      // We don't have user id handy here; a server route could infer from token, but we can store it later.
      // For now, just clear local flags.
      setDemoState(false, null);
    } catch (e) {
      console.warn("resetDemo failed", e);
    }
  }, [setDemoState]);

  const value = useMemo(
    () => ({ isDemoMode, demoPersona, simulateNewActivity, resetDemo, setDemoState }),
    [isDemoMode, demoPersona, simulateNewActivity, resetDemo, setDemoState]
  );

  return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>;
}

export function useDemoMode() {
  const ctx = useContext(DemoModeContext);
  if (!ctx) throw new Error("useDemoMode must be used within DemoModeProvider");
  return ctx;
}
