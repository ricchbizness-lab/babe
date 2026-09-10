"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Download, FileText, Image as ImageIcon, Mic, Paperclip, Receipt, Trash2, Upload, X } from "lucide-react";
import {
  Badge,
  Button,
  ConfirmModal,
  EditModal,
  EmptyState,
  Field,
  SearchInput,
  SelectField,
  Skeleton,
  Tabs,
  Timestamp,
  useToast,
} from "@/components/ui";
import { fetchWithAuth } from "@/lib/fetchClient";
import type { FeedItem } from "@/app/api/documents-feed/route";

const KIND_ICON: Record<FeedItem["kind"], typeof FileText> = {
  document: FileText,
  photo: ImageIcon,
  devis: FileText,
  facture: Receipt,
  rapport: Mic,
  attachment: Paperclip,
};

const DOWNLOADABLE_KINDS: FeedItem["kind"][] = ["document", "devis", "facture", "rapport"];

const TABS: { key: "tous" | "clients" | "chantiers" | "devis" | "factures" | "rapports"; label: string }[] = [
  { key: "tous", label: "Tous" },
  { key: "clients", label: "Clients" },
  { key: "chantiers", label: "Chantiers" },
  { key: "devis", label: "Devis" },
  { key: "factures", label: "Factures" },
  { key: "rapports", label: "Rapports" },
];

const ATTACHMENT_MAX_BYTES = 2 * 1024 * 1024;
const ATTACHMENT_ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg"];
const CATEGORY_LABEL: Record<string, string> = { contrat: "Contrat", attestation: "Attestation", photo: "Photo", autre: "Autre" };

const EMPTY_UPLOAD_FORM = { name: "", category: "autre", fileBase64: "", mimeType: "" };

export default function DocumentsPage() {
  const toast = useToast();
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("tous");
  const [query, setQuery] = useState("");
  const [modalItem, setModalItem] = useState<FeedItem | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState(EMPTY_UPLOAD_FORM);
  const [uploadError, setUploadError] = useState("");
  const [savingUpload, setSavingUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<FeedItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  function loadItems() {
    fetchWithAuth("/api/documents-feed")
      .then((res) => res.json())
      .then((data) => setItems(data.items ?? []));
  }

  useEffect(() => {
    loadItems();
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = (items ?? []).filter((item) => {
    const matchesTab = tab === "tous" || tab === "clients" || item.tab === tab;
    const matchesQuery =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q) ||
      (item.preview || "").toLowerCase().includes(q);
    return matchesTab && matchesQuery;
  });

  function openUpload() {
    setUploadForm(EMPTY_UPLOAD_FORM);
    setUploadError("");
    setUploading(true);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError("");
    if (!ATTACHMENT_ALLOWED_TYPES.includes(file.type)) {
      setUploadError("Format non supporté — utilisez un PDF, PNG ou JPG.");
      return;
    }
    if (file.size > ATTACHMENT_MAX_BYTES) {
      setUploadError("Fichier trop volumineux — 2 Mo maximum.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setUploadForm((f) => ({ ...f, fileBase64: String(reader.result), mimeType: file.type, name: f.name || file.name }));
    };
    reader.readAsDataURL(file);
  }

  async function confirmUpload() {
    if (!uploadForm.name.trim()) {
      toast.error("Le nom est requis.");
      return;
    }
    if (!uploadForm.fileBase64) {
      toast.error("Choisissez un fichier à uploader.");
      return;
    }
    setSavingUpload(true);
    try {
      const res = await fetchWithAuth("/api/attachments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: uploadForm.name,
          category: uploadForm.category,
          fileBase64: uploadForm.fileBase64,
          mimeType: uploadForm.mimeType,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Impossible d'ajouter ce document.");
        return;
      }
      toast.success("Document ajouté");
      setUploading(false);
      loadItems();
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setSavingUpload(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const rawId = deleteTarget.id.replace(/^attachment-/, "");
      const res = await fetchWithAuth(`/api/attachments/${rawId}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Erreur lors de la suppression.");
        return;
      }
      setItems((prev) => (prev ?? []).filter((i) => i.id !== deleteTarget.id));
      toast.success("Document supprimé");
      setDeleteTarget(null);
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="nova-page">
      <header className="nova-page-header-row">
        <div>
          <h1>Documents</h1>
          <p className="nova-page-subtitle">
            {items === null ? "…" : `${items.length} élément${items.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <Button onClick={openUpload}>
          <Upload size={16} strokeWidth={1.75} />
          Uploader un document
        </Button>
      </header>

      <SearchInput value={query} onChange={setQuery} placeholder="Rechercher dans tous les documents..." />

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {items === null ? (
        <Skeleton style={{ height: 300 }} />
      ) : tab === "clients" ? (
        <EmptyState
          icon="crm"
          title="Pas encore de documents liés à un client"
          description="Les documents générés (briefs, contenus marketing...) ne sont pour l'instant pas rattachés à un client précis dans les données de l'application."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="rapport"
          title={q ? "Aucun résultat pour cette recherche" : "Aucun document pour l'instant"}
          description={q ? undefined : "Les devis, factures, photos de chantier, rapports vocaux et pièces jointes uploadées apparaîtront ici au fur et à mesure."}
        />
      ) : (
        <ul className="nova-report-list">
          {filtered.map((item) => {
            const Icon = KIND_ICON[item.kind];
            const downloadable = DOWNLOADABLE_KINDS.includes(item.kind);
            return (
              <li key={item.id} className="nova-report-row">
                {item.imagePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imagePreview} alt="" className="nova-doc-thumb" />
                ) : (
                  <span className="nova-report-icon">
                    <Icon size={16} strokeWidth={1.75} />
                  </span>
                )}
                <div className="nova-report-info">
                  {item.kind === "photo" ? (
                    <Link href={item.href} className="nova-report-period nova-inline-link">
                      {item.title}
                    </Link>
                  ) : (
                    <button type="button" className="nova-report-period nova-inline-link nova-link-button" onClick={() => setModalItem(item)}>
                      {item.title}
                    </button>
                  )}
                  <span className="nova-page-subtitle">{item.subtitle}</span>
                  {item.preview && <span className="nova-truncate">{item.preview}</span>}
                </div>
                <Timestamp date={item.date} />
                <span className="nova-team-card-actions">
                  {downloadable && (
                    <a href={`/api/documents-feed/${item.id}/pdf`} className="nova-icon-btn" aria-label="Télécharger en PDF">
                      <Download size={14} strokeWidth={1.75} />
                    </a>
                  )}
                  {item.kind === "attachment" && (
                    <button type="button" className="nova-icon-btn" onClick={() => setDeleteTarget(item)} aria-label="Supprimer">
                      <Trash2 size={14} strokeWidth={1.75} />
                    </button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {modalItem && (
        <div className="nova-modal-overlay" onClick={() => setModalItem(null)}>
          <div className="nova-modal nova-modal-edit" role="dialog" aria-modal="true" aria-label={modalItem.title} onClick={(e) => e.stopPropagation()}>
            <div className="nova-planning-detail-header">
              <h3 className="nova-modal-title">{modalItem.title}</h3>
              <button type="button" className="nova-icon-btn" onClick={() => setModalItem(null)} aria-label="Fermer">
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>
            <p className="nova-page-subtitle">{modalItem.subtitle}</p>
            {modalItem.kind === "attachment" ? (
              modalItem.imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={modalItem.imagePreview} alt={modalItem.title} className="nova-attachment-preview-img" />
              ) : (
                <p className="nova-page-subtitle">Fichier {modalItem.mimeType}</p>
              )
            ) : (
              <p className="nova-card-text">{modalItem.content || "Aucun contenu disponible pour cet élément."}</p>
            )}
            <div className="nova-modal-actions">
              <Button variant="secondary" onClick={() => setModalItem(null)}>
                Fermer
              </Button>
              {modalItem.kind === "attachment" && modalItem.fileBase64 && (
                <a href={modalItem.fileBase64} download={modalItem.title} className="nova-btn nova-btn-primary">
                  <Download size={16} strokeWidth={1.75} />
                  Télécharger
                </a>
              )}
              {DOWNLOADABLE_KINDS.includes(modalItem.kind) && (
                <a href={`/api/documents-feed/${modalItem.id}/pdf`} className="nova-btn nova-btn-primary">
                  <Download size={16} strokeWidth={1.75} />
                  Télécharger PDF
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <EditModal
        open={uploading}
        title="Uploader un document"
        onCancel={() => setUploading(false)}
        onSave={confirmUpload}
        saving={savingUpload}
      >
        <Field label="Nom" required value={uploadForm.name} onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })} />
        <SelectField label="Catégorie" value={uploadForm.category} onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}>
          {Object.entries(CATEGORY_LABEL).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </SelectField>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          onChange={handleFileChange}
          className="nova-visually-hidden"
          id="attachment-upload-input"
        />
        <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
          <Upload size={16} strokeWidth={1.75} />
          {uploadForm.fileBase64 ? "Changer le fichier" : "Choisir un fichier"}
        </Button>
        <p className="nova-hint-standalone">{uploadForm.fileBase64 ? "Fichier prêt à être ajouté." : "PDF, PNG ou JPG, 2 Mo maximum."}</p>
        {uploadError && <div className="error">{uploadError}</div>}
      </EditModal>

      <ConfirmModal
        open={deleteTarget !== null}
        itemLabel={deleteTarget ? `le document « ${deleteTarget.title} »` : ""}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirming={deleting}
      />
    </div>
  );
}
