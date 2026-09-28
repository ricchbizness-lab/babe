"use client";

import qrcode from "qrcode-generator";

/** QR code généré côté client, sans appel réseau — même lien que celui affiché en texte à côté. */
export function TerrainQrCode({ value, size = 120 }: { value: string; size?: number }) {
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();
  const cellSize = Math.max(2, Math.round(size / qr.getModuleCount()));
  const dataUrl = qr.createDataURL(cellSize, cellSize);

  return <img src={dataUrl} alt="QR code du lien terrain" width={size} height={size} className="nova-terrain-qrcode" />;
}
