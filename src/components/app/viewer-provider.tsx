"use client";

import * as React from "react";
import type { Viewer } from "@/server/viewer";

const ViewerContext = React.createContext<Viewer | null>(null);

export function ViewerProvider({
  viewer,
  children,
}: {
  viewer: Viewer;
  children: React.ReactNode;
}) {
  return (
    <ViewerContext.Provider value={viewer}>{children}</ViewerContext.Provider>
  );
}

/** Access the current viewer in client components. */
export function useViewer(): Viewer {
  const ctx = React.useContext(ViewerContext);
  if (!ctx) {
    throw new Error("useViewer must be used within a ViewerProvider");
  }
  return ctx;
}
