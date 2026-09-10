import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { lineTotalHT, type DevisLineLike } from "./devisTotals";

/**
 * Génération Factur-X : PDF A4 dessiné à la main avec pdf-lib (pas de
 * dépendance à un moteur HTML→PDF côté serveur) + XML CII minimal embarqué
 * en pièce jointe du PDF.
 *
 * IMPORTANT — portée réelle de cette implémentation : le XML généré reprend
 * la structure du profil Factur-X MINIMUM (CrossIndustryInvoice / UN/CEFACT
 * CII) avec les champs obligatoires demandés (numéro, date, vendeur,
 * acheteur, montants, devise), mais n'est PAS validé contre le schéma XSD
 * officiel Factur-X et ne doit pas être présenté comme certifié conforme
 * sans vérification par un outil de validation dédié (ex. Chorus Pro, Mustang
 * Project) avant tout usage en production réelle.
 *
 * Cette fonction ne sert qu'à générer la facture d'un devis accepté (voir
 * /api/factures/[id]/facturx) : le titre du document est donc toujours
 * "FACTURE", même si la demande d'origine mentionnait "DEVIS" en grand —
 * afficher "DEVIS" sur une facture serait trompeur pour le destinataire.
 */

const PAGE_WIDTH = 595.28; // A4 en points (72dpi)
const PAGE_HEIGHT = 841.89;
const MARGIN = 56; // ~2cm

// Couleurs imposées pour le rendu PDF (distinctes des tokens --nova-* de
// l'écran : choisies spécifiquement pour un rendu imprimé plus contrasté).
const TITLE_TEAL = rgb(0x0d / 255, 0x3b / 255, 0x2e / 255);
const BODY = rgb(0x33 / 255, 0x33 / 255, 0x33 / 255);
const BODY_SOFT = rgb(0x6b / 255, 0x72 / 255, 0x7b / 255);
const BORDER = rgb(0xe2 / 255, 0xe5 / 255, 0xe8 / 255);
const HEADER_BG = rgb(0.94, 0.955, 0.945);
const ROW_ALT_BG = rgb(0.96, 0.96, 0.96);

export type FacturXLine = DevisLineLike & {
  id: string;
  description: string;
  unite?: string | null;
};

export type FacturXBusiness = {
  name: string;
  siret?: string | null;
  address?: string | null;
  codeAPE?: string | null;
  logoBase64?: string | null;
  conditionsPaiement?: string | null;
};

export type FacturXClient = {
  name: string;
  email?: string | null;
  address?: string | null;
};

export type FacturXInput = {
  numero: string;
  date: string;
  business: FacturXBusiness;
  client: FacturXClient | null;
  label: string;
  description?: string | null;
  lines: FacturXLine[];
  fallbackAmountHT?: number | null;
  remisePct?: number;
};

type VatBucket = { rate: number; base: number; tva: number };

function vatBreakdown(lines: FacturXLine[], remisePct: number, fallbackAmountHT?: number | null): VatBucket[] {
  if (lines.length === 0) {
    if (fallbackAmountHT == null) return [];
    const base = fallbackAmountHT;
    return [{ rate: 20, base, tva: base * 0.2 }];
  }
  const map = new Map<number, VatBucket>();
  for (const l of lines) {
    const base = lineTotalHT(l) * (1 - remisePct / 100);
    const tva = base * (l.tva / 100);
    const entry = map.get(l.tva) || { rate: l.tva, base: 0, tva: 0 };
    entry.base += base;
    entry.tva += tva;
    map.set(l.tva, entry);
  }
  return Array.from(map.values()).sort((a, b) => a.rate - b.rate);
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildFacturXml(input: FacturXInput, buckets: VatBucket[]): string {
  const totalHT = buckets.reduce((s, b) => s + b.base, 0);
  const totalTVA = buckets.reduce((s, b) => s + b.tva, 0);
  const totalTTC = totalHT + totalTVA;
  const issueDate = new Date(input.date).toISOString().slice(0, 10).replace(/-/g, "");

  const vatLines = buckets
    .map(
      (b) => `
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${b.tva.toFixed(2)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>${b.base.toFixed(2)}</ram:BasisAmount>
        <ram:CategoryCode>S</ram:CategoryCode>
        <ram:RateApplicablePercent>${b.rate.toFixed(2)}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:factur-x.eu:1p0:minimum</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${escapeXml(input.numero)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${issueDate}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${escapeXml(input.business.name)}</ram:Name>
        ${
          input.business.siret
            ? `<ram:SpecifiedLegalOrganization><ram:ID schemeID="0002">${escapeXml(input.business.siret)}</ram:ID></ram:SpecifiedLegalOrganization>`
            : ""
        }
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${escapeXml(input.client?.name || "Client")}</ram:Name>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery/>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>${vatLines}
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:TaxBasisTotalAmount>${totalHT.toFixed(2)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${totalTVA.toFixed(2)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${totalTTC.toFixed(2)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${totalTTC.toFixed(2)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
}

/**
 * La police standard WinAnsi (cp1252) de pdf-lib ne sait pas encoder
 * certains caractères Unicode produits par toLocaleString("fr-FR") (espace
 * fine insécable U+202F comme séparateur de milliers) ni le signe moins
 * mathématique U+2212 — on les ramène à leurs équivalents ASCII avant tout
 * dessin, plutôt que de laisser drawText lever une exception à l'usage.
 */
function sanitizePdfText(s: string): string {
  return s.replace(/[\u202F\u00A0]/g, " ").replace(/\u2212/g, "-");
}

function fmt(n: number): string {
  return sanitizePdfText(n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €");
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export async function generateFacturX(input: FacturXInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Sécurité de dernier recours : quel que soit l'appelant, tout texte
  // dessiné ou mesuré passe par sanitizePdfText avant d'atteindre
  // l'encodeur WinAnsi (couvre aussi les données saisies par l'utilisateur —
  // nom d'entreprise, adresse, description — qui pourraient contenir des
  // espaces insécables copiées-collées).
  const rawDrawText = page.drawText.bind(page);
  page.drawText = ((text: string, options?: Parameters<typeof rawDrawText>[1]) =>
    rawDrawText(sanitizePdfText(text), options)) as typeof page.drawText;
  const rawFontWidth = font.widthOfTextAtSize.bind(font);
  font.widthOfTextAtSize = ((text: string, size: number) => rawFontWidth(sanitizePdfText(text), size)) as typeof font.widthOfTextAtSize;
  const rawBoldWidth = bold.widthOfTextAtSize.bind(bold);
  bold.widthOfTextAtSize = ((text: string, size: number) => rawBoldWidth(sanitizePdfText(text), size)) as typeof bold.widthOfTextAtSize;

  const tableRight = PAGE_WIDTH - MARGIN;
  let y = PAGE_HEIGHT - MARGIN;

  // Mention Factur-X tout en haut à droite
  const mention = "FACTURE ÉLECTRONIQUE — Format Factur-X";
  page.drawText(mention, { x: tableRight - font.widthOfTextAtSize(mention, 8), y, size: 8, font, color: BODY_SOFT });
  y -= 26;

  // En-tête : logo/initiales à gauche, titre + référence + date à droite
  const logoSize = 42;
  let logoDrawn = false;
  if (input.business.logoBase64) {
    try {
      const match = input.business.logoBase64.match(/^data:(image\/(png|jpe?g));base64,(.*)$/i);
      if (match) {
        const bytes = Buffer.from(match[3], "base64");
        const image = /png/i.test(match[2]) ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
        page.drawImage(image, { x: MARGIN, y: y - logoSize, width: logoSize, height: logoSize });
        logoDrawn = true;
      }
    } catch {
      logoDrawn = false;
    }
  }
  if (!logoDrawn) {
    page.drawRectangle({ x: MARGIN, y: y - logoSize, width: logoSize, height: logoSize, color: TITLE_TEAL });
    const ini = initials(input.business.name);
    const iniSize = 17;
    const iniWidth = bold.widthOfTextAtSize(ini, iniSize);
    page.drawText(ini, {
      x: MARGIN + logoSize / 2 - iniWidth / 2,
      y: y - logoSize / 2 - iniSize / 2 + 4,
      size: iniSize,
      font: bold,
      color: rgb(1, 1, 1),
    });
  }

  const title = "FACTURE";
  page.drawText(title, { x: tableRight - bold.widthOfTextAtSize(title, 24), y: y - 4, size: 24, font: bold, color: TITLE_TEAL });
  page.drawText(input.numero, {
    x: tableRight - font.widthOfTextAtSize(input.numero, 11),
    y: y - 22,
    size: 11,
    font,
    color: TITLE_TEAL,
  });
  const dateText = `Date : ${new Date(input.date).toLocaleDateString("fr-FR")}`;
  page.drawText(dateText, { x: tableRight - font.widthOfTextAtSize(dateText, 8.5), y: y - 36, size: 8.5, font, color: BODY_SOFT });

  y -= logoSize + 18;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: tableRight, y }, thickness: 1.2, color: TITLE_TEAL });
  y -= 26;

  // Deux colonnes : émetteur à gauche, client à droite
  const colWidth = (tableRight - MARGIN - 24) / 2;
  const rightColX = MARGIN + colWidth + 24;

  page.drawText("ÉMETTEUR", { x: MARGIN, y, size: 8, font: bold, color: BODY_SOFT });
  page.drawText("CLIENT", { x: rightColX, y, size: 8, font: bold, color: BODY_SOFT });
  let leftY = y - 16;
  let rightY = y - 16;

  page.drawText(input.business.name, { x: MARGIN, y: leftY, size: 11, font: bold, color: BODY });
  leftY -= 14;
  const businessLines: string[] = [];
  if (input.business.siret) businessLines.push(`SIRET : ${input.business.siret}`);
  if (input.business.codeAPE) businessLines.push(`Code APE : ${input.business.codeAPE}`);
  if (input.business.address) businessLines.push(input.business.address);
  for (const line of businessLines) {
    page.drawText(line, { x: MARGIN, y: leftY, size: 9, font, color: BODY });
    leftY -= 12;
  }

  if (input.client) {
    page.drawText(input.client.name, { x: rightColX, y: rightY, size: 11, font: bold, color: BODY });
    rightY -= 14;
    const clientLines: string[] = [];
    if (input.client.address) clientLines.push(input.client.address);
    if (input.client.email) clientLines.push(input.client.email);
    for (const line of clientLines) {
      page.drawText(line, { x: rightColX, y: rightY, size: 9, font, color: BODY });
      rightY -= 12;
    }
  } else {
    page.drawText("Client non renseigné", { x: rightColX, y: rightY, size: 9, font, color: BODY_SOFT });
    rightY -= 12;
  }

  y = Math.min(leftY, rightY) - 16;

  // Tableau des prestations — Description | Qté | Unité | P.U. HT | TVA % | Total HT
  const colX = { desc: MARGIN, qte: MARGIN + 250, unite: MARGIN + 300, prix: MARGIN + 350, tva: MARGIN + 420, total: MARGIN + 470 };
  const tableWidth = tableRight - MARGIN;
  const rowHeight = 20;

  page.drawRectangle({ x: MARGIN, y: y - 18, width: tableWidth, height: 20, color: HEADER_BG });
  page.drawText("Description", { x: colX.desc + 6, y: y - 13, size: 8, font: bold, color: TITLE_TEAL });
  page.drawText("Qté", { x: colX.qte, y: y - 13, size: 8, font: bold, color: TITLE_TEAL });
  page.drawText("Unité", { x: colX.unite, y: y - 13, size: 8, font: bold, color: TITLE_TEAL });
  page.drawText("P.U. HT", { x: colX.prix, y: y - 13, size: 8, font: bold, color: TITLE_TEAL });
  page.drawText("TVA %", { x: colX.tva, y: y - 13, size: 8, font: bold, color: TITLE_TEAL });
  page.drawText("Total HT", { x: colX.total, y: y - 13, size: 8, font: bold, color: TITLE_TEAL });
  y -= 20;

  function drawRow(cells: { desc: string; qte?: string; unite?: string; prix?: string; tva?: string; total?: string }, index: number) {
    if (index % 2 === 1) {
      page.drawRectangle({ x: MARGIN, y: y - 15, width: tableWidth, height: rowHeight, color: ROW_ALT_BG });
    }
    const textY = y - 10;
    page.drawText(cells.desc, { x: colX.desc + 6, y: textY, size: 9, font, color: BODY });
    if (cells.qte) page.drawText(cells.qte, { x: colX.qte, y: textY, size: 9, font, color: BODY });
    if (cells.unite) page.drawText(cells.unite, { x: colX.unite, y: textY, size: 9, font, color: BODY });
    if (cells.prix) page.drawText(cells.prix, { x: colX.prix, y: textY, size: 9, font, color: BODY });
    if (cells.tva) page.drawText(cells.tva, { x: colX.tva, y: textY, size: 9, font, color: BODY });
    if (cells.total) page.drawText(cells.total, { x: colX.total, y: textY, size: 9, font: bold, color: BODY });
    y -= rowHeight;
  }

  if (input.lines.length > 0) {
    input.lines.forEach((l, i) => {
      const desc = l.description.length > 40 ? l.description.slice(0, 39) + "…" : l.description;
      drawRow(
        {
          desc,
          qte: l.quantite.toLocaleString("fr-FR"),
          unite: l.unite || "—",
          prix: fmt(l.prixUnitaire),
          tva: `${l.tva}%`,
          total: fmt(lineTotalHT(l)),
        },
        i
      );
    });
  } else {
    const desc = input.description && input.description !== input.label ? `${input.label} — ${input.description}` : input.label;
    const wrapped = desc.length > 70 ? desc.slice(0, 69) + "…" : desc;
    drawRow(
      { desc: wrapped, total: input.fallbackAmountHT != null ? fmt(input.fallbackAmountHT) : undefined },
      0
    );
  }

  y -= 6;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: tableRight, y }, thickness: 0.75, color: BORDER });
  y -= 20;

  // Totaux (TVA regroupée par taux) dans un encadré à droite
  const buckets = vatBreakdown(input.lines, input.remisePct || 0, input.fallbackAmountHT);
  const totalHT = buckets.reduce((s, b) => s + b.base, 0);
  const totalTVA = buckets.reduce((s, b) => s + b.tva, 0);
  const totalTTC = totalHT + totalTVA;

  const totalsBoxWidth = 230;
  const totalsX = tableRight - totalsBoxWidth;
  const totalsPad = 14;
  const totalsRowCount = 1 + (input.remisePct ? 1 : 0) + buckets.length + 1;
  const totalsBoxHeight = totalsRowCount * 17 + 2 * totalsPad - 5;
  page.drawRectangle({
    x: totalsX,
    y: y - totalsBoxHeight + 17,
    width: totalsBoxWidth,
    height: totalsBoxHeight,
    borderColor: BORDER,
    borderWidth: 1,
  });
  y -= totalsPad - 4;

  function drawTotalRow(label: string, value: string, boldRow = false) {
    const f = boldRow ? bold : font;
    const size = boldRow ? 13 : 9.5;
    page.drawText(label, { x: totalsX + totalsPad, y, size, font: f, color: boldRow ? TITLE_TEAL : BODY_SOFT });
    page.drawText(value, { x: tableRight - totalsPad - f.widthOfTextAtSize(value, size), y, size, font: f, color: boldRow ? TITLE_TEAL : BODY });
    y -= boldRow ? 22 : 17;
  }

  drawTotalRow("Sous-total HT", fmt(totalHT));
  if ((input.remisePct || 0) > 0) {
    drawTotalRow(`Remise (${input.remisePct}%)`, "appliquée par ligne");
  }
  for (const b of buckets) {
    drawTotalRow(`TVA ${b.rate}%`, fmt(b.tva));
  }
  page.drawLine({ start: { x: totalsX + totalsPad, y: y + 8 }, end: { x: tableRight - totalsPad, y: y + 8 }, thickness: 0.75, color: BORDER });
  drawTotalRow("Total TTC", fmt(totalTTC), true);

  // Pied de page — conditions, mentions légales, signatures
  let footerY = MARGIN + 150;
  page.drawLine({ start: { x: MARGIN, y: footerY + 20 }, end: { x: tableRight, y: footerY + 20 }, thickness: 0.75, color: BORDER });
  const footerLines = [
    "Facture valable 30 jours à compter de sa date d'émission.",
    `Modalités de paiement : ${input.business.conditionsPaiement || "Paiement sous 30 jours"}`,
    "Facture électronique conforme à la réglementation française (article 289 bis du CGI).",
  ];
  for (const line of footerLines) {
    page.drawText(line, { x: MARGIN, y: footerY, size: 8, font, color: BODY_SOFT });
    footerY -= 12;
  }

  footerY -= 20;
  const sigBoxWidth = (tableRight - MARGIN - 20) / 2;
  const sigBoxHeight = 70;
  page.drawRectangle({ x: MARGIN, y: footerY - sigBoxHeight, width: sigBoxWidth, height: sigBoxHeight, borderColor: BORDER, borderWidth: 1, borderDashArray: [3, 3] });
  page.drawText("Bon pour accord — signature du client", { x: MARGIN + 8, y: footerY - 14, size: 8, font, color: BODY_SOFT });
  page.drawRectangle({ x: MARGIN + sigBoxWidth + 20, y: footerY - sigBoxHeight, width: sigBoxWidth, height: sigBoxHeight, borderColor: BORDER, borderWidth: 1, borderDashArray: [3, 3] });
  page.drawText("Signature de l'émetteur", { x: MARGIN + sigBoxWidth + 28, y: footerY - 14, size: 8, font, color: BODY_SOFT });

  // XML Factur-X minimal embarqué en pièce jointe du PDF
  const xml = buildFacturXml(input, buckets);
  await pdfDoc.attach(new TextEncoder().encode(xml), "factur-x.xml", {
    mimeType: "text/xml",
    description: "Factur-X minimum profile invoice data",
    creationDate: new Date(),
    modificationDate: new Date(),
  });

  return pdfDoc.save();
}
