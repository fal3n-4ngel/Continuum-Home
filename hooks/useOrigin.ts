"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

function getSnapshot() {
  return window.location.origin;
}

function getServerSnapshot() {
  return "";
}

export function useOrigin(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
