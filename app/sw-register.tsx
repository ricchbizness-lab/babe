"use client";

import { useEffect } from "react";

/** Enregistre le service worker au montage — condition sur la disponibilité de l'API, silencieux si absente (navigateurs anciens, contexte non sécurisé). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("Échec de l'enregistrement du service worker :", err);
    });
  }, []);

  return null;
}
