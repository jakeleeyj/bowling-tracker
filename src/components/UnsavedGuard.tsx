"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface UnsavedGuardContextValue {
  hasUnsaved: boolean;
  setHasUnsaved: (v: boolean) => void;
  /** Returns true if navigation should proceed */
  confirmLeave: () => boolean;
}

const UnsavedGuardContext = createContext<UnsavedGuardContextValue>({
  hasUnsaved: false,
  setHasUnsaved: () => {},
  confirmLeave: () => true,
});

export function useUnsavedGuard() {
  return useContext(UnsavedGuardContext);
}

export function UnsavedGuardProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hasUnsaved, setHasUnsaved] = useState(false);

  const confirmLeave = useCallback(() => {
    if (!hasUnsaved) return true;
    const shouldLeave = window.confirm(
      "You have unsaved scoring in progress. Leave anyway?",
    );
    if (shouldLeave) setHasUnsaved(false);
    return shouldLeave;
  }, [hasUnsaved]);

  return (
    <UnsavedGuardContext.Provider
      value={{ hasUnsaved, setHasUnsaved, confirmLeave }}
    >
      {children}
    </UnsavedGuardContext.Provider>
  );
}
