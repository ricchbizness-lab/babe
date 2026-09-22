/**
 * Export CSV côté client, à partir de données déjà chargées dans la page —
 * pas de route API dédiée. Échappement RFC 4180 minimal (guillemets doublés,
 * champ entre guillemets si virgule/guillemet/retour à la ligne) + BOM UTF-8
 * pour qu'Excel affiche correctement les accents.
 */

function escapeCsvField(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCSV(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvField).join(","));
  return lines.join("\r\n");
}

export function downloadCSV(filename: string, content: string): void {
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
