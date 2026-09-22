"use client";

import { useEffect, useRef } from "react";

/**
 * Sauvegarde automatique de formulaire long dans sessionStorage — évite de
 * perdre la saisie sur un changement d'onglet ou un rechargement accidentel.
 * Restaure au montage si un brouillon existe, puis persiste à chaque
 * modification. clearFormDraft() est à appeler après une soumission réussie.
 */
export function useFormDraft<T>(key: string, form: T, setForm: (value: T) => void) {
  const restored = useRef(false);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const saved = sessionStorage.getItem(key);
    if (saved) {
      try {
        setForm(JSON.parse(saved));
      } catch {
        sessionStorage.removeItem(key);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!restored.current) return;
    sessionStorage.setItem(key, JSON.stringify(form));
  }, [key, form]);
}

export function clearFormDraft(key: string) {
  sessionStorage.removeItem(key);
}
