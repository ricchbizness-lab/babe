/** Nom affiché et initiales pour l'avatar — partagé entre la sidebar (serveur) et la page compte (client). */

export function getDisplayName(firstName: string | null, lastName: string | null, email: string): string {
  const full = [firstName, lastName].filter(Boolean).join(" ").trim();
  return full || email;
}

export function getInitials(firstName: string | null, lastName: string | null, email: string): string {
  if (firstName || lastName) {
    return [firstName, lastName]
      .filter(Boolean)
      .map((s) => (s as string).charAt(0).toUpperCase())
      .join("")
      .slice(0, 2);
  }
  return email.charAt(0).toUpperCase();
}
