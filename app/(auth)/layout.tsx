"use client";

import React from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-bg-primary p-4 text-text-primary transition-colors duration-200">
      {children}
    </div>
  );
}
