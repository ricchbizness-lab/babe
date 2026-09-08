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
 */

const PAGE_WIDTH = 595.28; // A4 en points (72dpi)
const PAGE_HEIGHT = 841.89;
const MARGIN = 56; // ~2cm

const TEAL = rgb(0x14 / 255, 0x59 / 255, 0x4a / 255);
const INK = rgb(0x14 / 255, 0x18 / 255, 0x1c / 255);
const INK_SOFT = rgb(0x5a / 255, 0x63 / 255, 0x6b / 255);
const BORDER = rgb(0xe2 / 255, 0xe5 / 255, 0xe8 / 255);

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
  return s.replace(/[  ]/g, " ").replace(/−/g, "-");
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

  let y = PAGE_HEIGHT - MARGIN;

  // Mention Factur-X en haut à droite
  const mention = "FACTURE ÉLECTRONIQUE — Format Factur-X";
  const mentionWidth = font.widthOfTextAtSize(mention, 8);
  page.drawText(mention, { x: PAGE_WIDTH - MARGIN - mentionWidth, y, size: 8, font, color: INK_SOFT });
  y -= 22;

  // Logo (image ou initiales sur carré teal) + identité entreprise
  const logoSize = 40;
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
    page.drawRectangle({ x: MARGIN, y: y - logoSize, width: logoSize, height: logoSize, color: TEAL });
    const ini = initials(input.business.name);
    const iniSize = 16;
    const iniWidth = bold.widthOfTextAtSize(ini, iniSize);
    page.drawText(ini, {
      x: MARGIN + logoSize / 2 - iniWidth / 2,
      y: y - logoSize / 2 - iniSize / 2 + 4,
      size: iniSize,
      font: bold,
      color: rgb(1, 1, 1),
    });
  }

  const textX = MARGIN + logoSize + 12;
  page.drawText(input.business.name, { x: textX, y: y - 12, size: 13, font: bold, color: INK });
  let metaY = y - 26;
  const metaLines: string[] = [];
  if (input.business.siret) metaLines.push(`SIRET : ${input.business.siret}`);
  if (input.business.codeAPE) metaLines.push(`Code APE : ${input.business.codeAPE}`);
  if (input.business.address) metaLines.push(input.business.address);
  for (const line of metaLines) {
    page.drawText(line, { x: textX, y: metaY, size: 8.5, font, color: INK_SOFT });
    metaY -= 12;
  }

  // Titre + référence à droite
  const title = "FACTURE";
  page.drawText(title, { x: PAGE_WIDTH - MARGIN - bold.widthOfTextAtSize(title, 22), y: y - 18, size: 22, font: bold, color: INK });
  const numText = input.numero;
  page.drawText(numText, {
    x: PAGE_WIDTH - MARGIN - font.widthOfTextAtSize(numText, 11),
    y: y - 34,
    size: 11,
    font,
    color: TEAL,
  });
  const dateText = `Date : ${new Date(input.date).toLocaleDateString("fr-FR")}`;
  page.drawText(dateText, {
    x: PAGE_WIDTH - MARGIN - font.widthOfTextAtSize(dateText, 8.5),
    y: y - 47,
    size: 8.5,
    font,
    color: INK_SOFT,
  });

  y -= logoSize + 20;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness: 1.2, color: INK });
  y -= 24;

  // Encadré client
  if (input.client) {
    const boxHeight = 56;
    page.drawRectangle({ x: MARGIN, y: y - boxHeight, width: PAGE_WIDTH - 2 * MARGIN, height: boxHeight, borderColor: BORDER, borderWidth: 1 });
    let cy = y - 14;
    page.drawText("À l'attention de", { x: MARGIN + 10, y: cy, size: 8, font, color: INK_SOFT });
    cy -= 14;
    page.drawText(input.client.name, { x: MARGIN + 10, y: cy, size: 11, font: bold, color: INK });
    cy -= 14;
    if (input.client.address) {
      page.drawText(input.client.address, { x: MARGIN + 10, y: cy, size: 9, font, color: INK });
      cy -= 12;
    }
    if (input.client.email) {
      page.drawText(input.client.email, { x: MARGIN + 10, y: cy, size: 9, font, color: INK });
    }
    y -= boxHeight + 24;
  }

  // Tableau des prestations
  const colX = { desc: MARGIN, qte: MARGIN + 250, unite: MARGIN + 300, prix: MARGIN + 350, tva: MARGIN + 420, total: MARGIN + 470 };
  const tableRight = PAGE_WIDTH - MARGIN;

  function drawTableHeader(atY: number) {
    page.drawRectangle({ x: MARGIN, y: atY - 16, width: tableRight - MARGIN, height: 18, color: rgb(0.96, 0.97, 0.96) });
    page.drawText("Description", { x: colX.desc + 6, y: atY - 12, size: 8, font: bold, color: INK_SOFT });
    page.drawText("Qté", { x: colX.qte, y: atY - 12, size: 8, font: bold, color: INK_SOFT });
    page.drawText("Unité", { x: colX.unite, y: atY - 12, size: 8, font: bold, color: INK_SOFT });
    page.drawText("Prix HT", { x: colX.prix, y: atY - 12, size: 8, font: bold, color: INK_SOFT });
    page.drawText("TVA %", { x: colX.tva, y: atY - 12, size: 8, font: bold, color: INK_SOFT });
    page.drawText("Total HT", { x: colX.total, y: atY - 12, size: 8, font: bold, color: INK_SOFT });
  }

  drawTableHeader(y);
  y -= 26;

  const rowHeight = 18;
  if (input.lines.length > 0) {
    for (const l of input.lines) {
      const desc = l.description.length > 42 ? l.description.slice(0, 41) + "…" : l.description;
      page.drawText(desc, { x: colX.desc + 6, y, size: 9, font, color: INK });
      page.drawText(l.quantite.toLocaleString("fr-FR"), { x: colX.qte, y, size: 9, font, color: INK });
      page.drawText(l.unite || "—", { x: colX.unite, y, size: 9, font, color: INK });
      page.drawText(fmt(l.prixUnitaire), { x: colX.prix, y, size: 9, font, color: INK });
      page.drawText(`${l.tva}%`, { x: colX.tva, y, size: 9, font, color: INK });
      page.drawText(fmt(lineTotalHT(l)), { x: colX.total, y, size: 9, font, color: INK });
      y -= rowHeight;
    }
  } else {
    const desc = input.description || input.label;
    page.drawText(input.label, { x: colX.desc + 6, y, size: 9, font: bold, color: INK });
    y -= 12;
    if (desc && desc !== input.label) {
      const wrapped = desc.length > 90 ? desc.slice(0, 89) + "…" : desc;
      page.drawText(wrapped, { x: colX.desc + 6, y, size: 8.5, font, color: INK_SOFT });
      y -= 12;
    }
    if (input.fallbackAmountHT != null) {
      page.drawText(fmt(input.fallbackAmountHT), { x: colX.total, y: y + 12, size: 9, font, color: INK });
    }
    y -= rowHeight;
  }

  y -= 10;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: tableRight, y }, thickness: 0.75, color: BORDER });
  y -= 20;

  // Totaux (TVA regroupée par taux)
  const buckets = vatBreakdown(input.lines, input.remisePct || 0, input.fallbackAmountHT);
  const totalHT = buckets.reduce((s, b) => s + b.base, 0);
  const totalTVA = buckets.reduce((s, b) => s + b.tva, 0);
  const totalTTC = totalHT + totalTVA;

  const totalsBoxWidth = 220;
  const totalsX = tableRight - totalsBoxWidth;
  function drawTotalRow(label: string, value: string, boldRow = false) {
    const f = boldRow ? bold : font;
    const size = boldRow ? 12 : 9.5;
    page.drawText(label, { x: totalsX, y, size, font: f, color: boldRow ? INK : INK_SOFT });
    page.drawText(value, { x: tableRight - f.widthOfTextAtSize(value, size), y, size, font: f, color: INK });
    y -= boldRow ? 20 : 15;
  }

  drawTotalRow("Sous-total HT", fmt(totalHT));
  if ((input.remisePct || 0) > 0) {
    drawTotalRow(`Remise (${input.remisePct}%)`, `− appliquée par ligne`);
  }
  for (const b of buckets) {
    drawTotalRow(`TVA ${b.rate}%`, fmt(b.tva));
  }
  page.drawLine({ start: { x: totalsX, y: y + 8 }, end: { x: tableRight, y: y + 8 }, thickness: 0.75, color: BORDER });
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
    page.drawText(line, { x: MARGIN, y: footerY, size: 8, font, color: INK_SOFT });
    footerY -= 12;
  }

  footerY -= 20;
  const boxWidth = (tableRight - MARGIN - 20) / 2;
  const boxHeight = 70;
  page.drawRectangle({ x: MARGIN, y: footerY - boxHeight, width: boxWidth, height: boxHeight, borderColor: BORDER, borderWidth: 1, borderDashArray: [3, 3] });
  page.drawText("Bon pour accord — signature du client", { x: MARGIN + 8, y: footerY - 14, size: 8, font, color: INK_SOFT });
  page.drawRectangle({ x: MARGIN + boxWidth + 20, y: footerY - boxHeight, width: boxWidth, height: boxHeight, borderColor: BORDER, borderWidth: 1, borderDashArray: [3, 3] });
  page.drawText("Signature de l'émetteur", { x: MARGIN + boxWidth + 28, y: footerY - 14, size: 8, font, color: INK_SOFT });

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
