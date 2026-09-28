"use client";

import React, { useState, useEffect } from "react";
import { LogoMark } from "@/components/Logo";
import { SITE_NAME } from "@/lib/utils";
import { safeLocalStorage } from "@/lib/utils/storage";
import { X, Share, PlusSquare, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const DISMISS_KEY = "continuum_install_banner_dismissed";
const COOLDOWN_DAYS = 7;

export function InstallBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if running in standalone mode (already installed as PWA)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) return;

    // Check cooldown from last dismissal
    const dismissedAt = safeLocalStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const daysSinceDismiss = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismiss < COOLDOWN_DAYS) {
        return;
      }
    }

    // Check if mobile device
    const ua = window.navigator.userAgent || "";
    const isIosDevice = /iPhone|iPad|iPod/i.test(ua) && !(window as any).MSStream;
    const isMobileDevice =
      isIosDevice ||
      /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
      (window.innerWidth < 768 && "ontouchstart" in window);

    if (!isMobileDevice) return;

    setIsIos(isIosDevice);

    if (isIosDevice) {
      // Delay showing on iOS so it doesn't interrupt immediate first interaction
      const timer = setTimeout(() => setIsVisible(true), 3000);
      return () => clearTimeout(timer);
    }

    // Android / Chromium beforeinstallprompt handler
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Also handle appinstalled event
    const handleAppInstalled = () => {
      setIsVisible(false);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setShowIosGuide(false);
    safeLocalStorage.setItem(DISMISS_KEY, Date.now().toString());
  };

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.aside
        aria-label="Install App"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className="fixed bottom-20 left-4 right-4 z-[999] max-w-[420px] mx-auto rounded-sm border border-border-subtle bg-bg-card/95 p-3.5 shadow-subtle backdrop-blur-xl apple-sheet-spring"
        style={{ paddingBottom: "calc(0.875rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xs border border-border-subtle bg-bg-secondary text-text-primary shadow-2xs">
              <LogoMark size={18} className="text-accent-terracotta" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[13px] font-medium text-text-primary">Install {SITE_NAME}</span>
                <span className="rounded-2xs border border-border-subtle bg-bg-secondary px-1 py-0.2 font-mono text-[8px] font-semibold text-text-muted uppercase">PWA</span>
              </div>
              <p className="truncate text-[11px] text-text-secondary">
                {isIos ? "Add to Home Screen for the best experience" : "Fast, offline-ready native app experience"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex h-8 items-center gap-1.5 rounded-xs border border-accent-terracotta/40 bg-accent-terracotta px-2.5 text-[11px] font-medium text-white shadow-2xs transition-transform active:scale-95 cursor-pointer"
            >
              {isIos ? <Share className="h-3 w-3" /> : <Download className="h-3 w-3" />}
              <span>Install</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss banner"
              className="flex h-8 w-8 items-center justify-center rounded-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* iOS Step-by-Step Instructions Drawer */}
        {showIosGuide && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 border-t border-border-subtle pt-3 text-[11px] text-text-secondary flex flex-col gap-2"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bg-secondary text-text-primary font-mono text-[10px] font-bold">1</span>
              <span>Tap the <Share className="inline h-3 w-3 mx-1 text-text-primary" /> <strong>Share</strong> button in Safari's bottom toolbar.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bg-secondary text-text-primary font-mono text-[10px] font-bold">2</span>
              <span>Scroll down and select <PlusSquare className="inline h-3 w-3 mx-1 text-text-primary" /> <strong>Add to Home Screen</strong>.</span>
            </div>
          </motion.div>
        )}
      </motion.aside>
    </AnimatePresence>
  );
}
