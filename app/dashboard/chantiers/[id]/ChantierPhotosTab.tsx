"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Trash2, Upload } from "lucide-react";
import { Button, ConfirmModal, EmptyState, useToast } from "@/components/ui";
import { fetchWithAuth } from "@/lib/fetchClient";

type Photo = { id: string; imageBase64: string; caption: string | null; createdAt: string };

const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
const PHOTO_ALLOWED_TYPES = ["image/png", "image/jpeg"];

export function ChantierPhotosTab({ projectId, photos, onRefresh }: { projectId: string; photos: Photo[]; onRefresh: () => void }) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Photo | null>(null);
  const [deleting, setDeleting] = useState(false);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!PHOTO_ALLOWED_TYPES.includes(file.type)) {
      toast.error("Format non supporté — utilisez un fichier PNG ou JPG.");
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      toast.error("Fichier trop volumineux — 2 Mo maximum.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      setUploading(true);
      try {
        const res = await fetchWithAuth(`/api/projects/${projectId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: String(reader.result) }),
        });
        if (!res.ok) {
          toast.error("Impossible d'ajouter cette photo.");
          return;
        }
        toast.success("Photo ajoutée");
        onRefresh();
      } catch {
        toast.error("Impossible de joindre le serveur — réessayez.");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetchWithAuth(`/api/project-photos/${deleteTarget.id}`, { method: "DELETE" });
      setDeleting(false);
      if (res.ok) {
        toast.success("Photo supprimée");
        onRefresh();
      } else {
        toast.error("Erreur lors de la suppression de la photo.");
      }
    } catch {
      setDeleting(false);
      toast.error("Impossible de joindre le serveur — réessayez.");
    }
    setDeleteTarget(null);
  }

  return (
    <div className="nova-photos-tab">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg"
        onChange={handleFileChange}
        className="nova-visually-hidden"
      />
      <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
        <Upload size={16} strokeWidth={1.75} />
        {uploading ? "Envoi..." : "Ajouter une photo"}
      </Button>

      {photos.length === 0 ? (
        <EmptyState
          icon="chantiers"
          title="Aucune photo pour l'instant"
          description="Ajoutez des photos d'avancement du chantier avec le bouton ci-dessus."
        />
      ) : (
        <div className="nova-photos-grid">
          {photos.map((p) => (
            <div key={p.id} className="nova-photo-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.imageBase64} alt={p.caption || "Photo du chantier"} />
              <button
                type="button"
                className="nova-photo-card-delete"
                onClick={() => setDeleteTarget(p)}
                aria-label="Supprimer la photo"
              >
                <Trash2 size={14} strokeWidth={1.75} />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={deleteTarget !== null}
        itemLabel="cette photo"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirming={deleting}
      />
    </div>
  );
}
