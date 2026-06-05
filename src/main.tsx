import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// One-time cache cleanup to fix stale auth tokens preventing login.
// Bump CACHE_VERSION whenever a new forced cleanup is needed.
const CACHE_VERSION = "2026-06-05-1";
try {
  const current = localStorage.getItem("app_cache_version");
  if (current !== CACHE_VERSION) {
    // Remove stale Supabase auth tokens that may be corrupted/expired
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (
        k.startsWith("sb-") ||
        k.includes("supabase.auth") ||
        k.includes("tanstack") ||
        k.includes("react-query") ||
        k.includes("query-cache")
      ) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    try {
      sessionStorage.clear();
    } catch {}
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister().catch(() => {});
        });
      }).catch(() => {});
    }
    // Clear browser caches (PWA / fetch cache) if available
    if (typeof caches !== "undefined" && caches?.keys) {
      caches.keys().then((names) => names.forEach((n) => caches.delete(n))).catch(() => {});
    }
    localStorage.setItem("app_cache_version", CACHE_VERSION);
  }
} catch {
  // ignore — never block app boot
}

createRoot(document.getElementById("root")!).render(<App />);
