"use client";

import React from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-bg-primary text-text-primary">
      {children}
    </div>
  );
}
