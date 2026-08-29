"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  ConfirmModal,
  DatePickerField,
  EditModal,
  EmptyState,
  Field,
  MetricBar,
  SelectField,
  Table,
  TableSkeleton,
  Tabs,
  Timestamp,
  useToast,
  type BadgeTone,
  type TableColumn,
} from "@/components/ui";
import { purchaseReference } from "@/lib/achats";
import { toDateKey } from "@/lib/dates";
import { fetchWithAuth } from "@/lib/fetchClient";

type ProjectOption = { id: string; name: string };

type Supplier = {
  id: string;
  name: string;
  contact: string | null;
  email: string | null;
  phone: string | null;
  category: string | null;
  purchases: { amount: number; status: string }[];
};

type Purchase = {
  id: string;
  description: string;
  amount: number;
  status: string;
  orderDate: string;
  expectedDate: string | null;
  supplier: { id: string; name: string };
  project: { id: string; name: string } | null;
};

const PURCHASE_STATUS_LABEL: Record<string, string> = {
  en_attente: "En attente",
  en_cours: "En cours",
  recu: "Reçu",
  annule: "Annulé",
};
const PURCHASE_STATUS_TONE: Record<string, BadgeTone> = {
  en_attente: "amber",
  en_cours: "blue",
  recu: "success",
  annule: "neutral",
};

const EMPTY_SUPPLIER_FORM = { name: "", contact: "", email: "", phone: "", category: "" };
const EMPTY_PURCHASE_FORM = { supplierId: "", projectId: "", description: "", amount: "", status: "en_attente", orderDate: "", expectedDate: "" };

export default function AchatsPage() {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<"achats" | "fournisseurs" | "stock">("achats");
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null);
  const [purchases, setPurchases] = useState<Purchase[] | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  const [addingSupplier, setAddingSupplier] = useState(false);
  const [supplierForm, setSupplierForm] = useState(EMPTY_SUPPLIER_FORM);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [editSupplierTarget, setEditSupplierTarget] = useState<Supplier | null>(null);
  const [deleteSupplierTarget, setDeleteSupplierTarget] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState(false);

  const [addingPurchase, setAddingPurchase] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState(EMPTY_PURCHASE_FORM);
  const [savingPurchase, setSavingPurchase] = useState(false);
  const [editPurchaseTarget, setEditPurchaseTarget] = useState<Purchase | null>(null);
  const [deletePurchaseTarget, setDeletePurchaseTarget] = useState<Purchase | null>(null);
  const [deletingPurchase, setDeletingPurchase] = useState(false);

  useEffect(() => {
    fetchWithAuth("/api/suppliers")
      .then((res) => res.json())
      .then((data) => setSuppliers(data.suppliers ?? []));
    fetchWithAuth("/api/purchases")
      .then((res) => res.json())
      .then((data) => setPurchases(data.purchases ?? []));
    fetchWithAuth("/api/projects")
      .then((res) => res.json())
      .then((data) => setProjects((data.projects ?? []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))));
  }, []);

  const loading = suppliers === null || purchases === null;

  // --- Fournisseurs ---

  function openAddSupplier() {
    setSupplierForm(EMPTY_SUPPLIER_FORM);
    setAddingSupplier(true);
  }

  async function confirmAddSupplier() {
    if (!supplierForm.name.trim()) {
      toast.error("Le nom est requis.");
      return;
    }
    setSavingSupplier(true);
    try {
      const res = await fetchWithAuth("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(supplierForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Impossible d'ajouter ce fournisseur.");
        return;
      }
      const data = await res.json();
      setSuppliers((prev) => [...(prev ?? []), { ...data.supplier, purchases: [] }]);
      toast.success("Fournisseur ajouté");
      router.refresh();
      setAddingSupplier(false);
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setSavingSupplier(false);
    }
  }

  function openEditSupplier(s: Supplier) {
    setSupplierForm({ name: s.name, contact: s.contact || "", email: s.email || "", phone: s.phone || "", category: s.category || "" });
    setEditSupplierTarget(s);
  }

  async function confirmEditSupplier() {
    if (!editSupplierTarget) return;
    if (!supplierForm.name.trim()) {
      toast.error("Le nom est requis.");
      return;
    }
    setSavingSupplier(true);
    try {
      const res = await fetchWithAuth(`/api/suppliers/${editSupplierTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(supplierForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Impossible de modifier ce fournisseur.");
        return;
      }
      const data = await res.json();
      setSuppliers((prev) => (prev ?? []).map((s) => (s.id === data.supplier.id ? data.supplier : s)));
      toast.success("Fournisseur mis à jour");
      router.refresh();
      setEditSupplierTarget(null);
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setSavingSupplier(false);
    }
  }

  async function confirmDeleteSupplier() {
    if (!deleteSupplierTarget) return;
    setDeletingSupplier(true);
    try {
      const res = await fetchWithAuth(`/api/suppliers/${deleteSupplierTarget.id}`, { method: "DELETE" });
      setDeletingSupplier(false);
      if (res.ok) {
        setSuppliers((prev) => (prev ?? []).filter((s) => s.id !== deleteSupplierTarget.id));
        setPurchases((prev) => (prev ?? []).filter((p) => p.supplier.id !== deleteSupplierTarget.id));
        toast.success("Fournisseur supprimé");
        router.refresh();
      } else {
        toast.error("Erreur lors de la suppression du fournisseur.");
      }
    } catch {
      setDeletingSupplier(false);
      toast.error("Impossible de joindre le serveur — réessayez.");
    }
    setDeleteSupplierTarget(null);
  }

  // --- Achats ---

  function openAddPurchase() {
    setPurchaseForm(EMPTY_PURCHASE_FORM);
    setAddingPurchase(true);
  }

  async function confirmAddPurchase() {
    if (!purchaseForm.supplierId) {
      toast.error("Choisissez un fournisseur.");
      return;
    }
    if (!purchaseForm.description.trim()) {
      toast.error("La description est requise.");
      return;
    }
    setSavingPurchase(true);
    try {
      const res = await fetchWithAuth("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: purchaseForm.supplierId,
          projectId: purchaseForm.projectId || undefined,
          description: purchaseForm.description,
          amount: Number(purchaseForm.amount) || 0,
          status: purchaseForm.status,
          orderDate: purchaseForm.orderDate ? new Date(`${purchaseForm.orderDate}T00:00:00.000Z`).toISOString() : undefined,
          expectedDate: purchaseForm.expectedDate ? new Date(`${purchaseForm.expectedDate}T00:00:00.000Z`).toISOString() : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Impossible de créer cet achat.");
        return;
      }
      const data = await res.json();
      setPurchases((prev) => [data.purchase, ...(prev ?? [])]);
      toast.success("Achat créé");
      router.refresh();
      setAddingPurchase(false);
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setSavingPurchase(false);
    }
  }

  function openEditPurchase(p: Purchase) {
    setPurchaseForm({
      supplierId: p.supplier.id,
      projectId: p.project?.id || "",
      description: p.description,
      amount: String(p.amount),
      status: p.status,
      orderDate: toDateKey(new Date(p.orderDate)),
      expectedDate: p.expectedDate ? toDateKey(new Date(p.expectedDate)) : "",
    });
    setEditPurchaseTarget(p);
  }

  async function confirmEditPurchase() {
    if (!editPurchaseTarget) return;
    setSavingPurchase(true);
    try {
      const res = await fetchWithAuth(`/api/purchases/${editPurchaseTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: purchaseForm.supplierId,
          projectId: purchaseForm.projectId || undefined,
          description: purchaseForm.description,
          amount: Number(purchaseForm.amount) || 0,
          status: purchaseForm.status,
          orderDate: purchaseForm.orderDate ? new Date(`${purchaseForm.orderDate}T00:00:00.000Z`).toISOString() : undefined,
          expectedDate: purchaseForm.expectedDate ? new Date(`${purchaseForm.expectedDate}T00:00:00.000Z`).toISOString() : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Impossible de modifier cet achat.");
        return;
      }
      const data = await res.json();
      setPurchases((prev) => (prev ?? []).map((p) => (p.id === data.purchase.id ? data.purchase : p)));
      toast.success("Achat mis à jour");
      router.refresh();
      setEditPurchaseTarget(null);
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setSavingPurchase(false);
    }
  }

  async function confirmDeletePurchase() {
    if (!deletePurchaseTarget) return;
    setDeletingPurchase(true);
    try {
      const res = await fetchWithAuth(`/api/purchases/${deletePurchaseTarget.id}`, { method: "DELETE" });
      setDeletingPurchase(false);
      if (res.ok) {
        setPurchases((prev) => (prev ?? []).filter((p) => p.id !== deletePurchaseTarget.id));
        toast.success("Achat supprimé");
        router.refresh();
      } else {
        toast.error("Erreur lors de la suppression de l'achat.");
      }
    } catch {
      setDeletingPurchase(false);
      toast.error("Impossible de joindre le serveur — réessayez.");
    }
    setDeletePurchaseTarget(null);
  }

  // --- Métriques ---

  const now = new Date();
  const purchasesList = purchases ?? [];
  const achatsCeMois = purchasesList
    .filter(
      (p) =>
        p.status !== "annule" &&
        new Date(p.orderDate).getMonth() === now.getMonth() &&
        new Date(p.orderDate).getFullYear() === now.getFullYear()
    )
    .reduce((sum, p) => sum + p.amount, 0);
  const commandesEnCours = purchasesList.filter((p) => p.status === "en_cours").length;
  const fournisseursActifs = (suppliers ?? []).filter((s) => s.purchases.some((p) => p.status !== "annule")).length;

  const chronological = [...purchasesList].sort((a, b) => new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime());
  const referenceById = new Map<string, string>();
  chronological.forEach((p, i) => referenceById.set(p.id, purchaseReference(i, p.orderDate)));

  const purchaseColumns: TableColumn<Purchase>[] = [
    { key: "reference", label: "Commande", render: (p) => referenceById.get(p.id) || "—", emphasis: "title" },
    { key: "supplier", label: "Fournisseur", render: (p) => p.supplier.name },
    { key: "project", label: "Chantier", render: (p) => p.project?.name || "—" },
    {
      key: "amount",
      label: "Montant",
      align: "right",
      render: (p) => `${p.amount.toLocaleString("fr-FR")} €`,
      sortable: true,
      sortValue: (p) => p.amount,
      emphasis: "amount",
    },
    {
      key: "status",
      label: "Statut",
      render: (p) => <Badge tone={PURCHASE_STATUS_TONE[p.status] || "neutral"}>{PURCHASE_STATUS_LABEL[p.status] || p.status}</Badge>,
    },
    { key: "orderDate", label: "Date", render: (p) => <Timestamp date={p.orderDate} /> },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (p) => (
        <span className="nova-team-card-actions">
          <button type="button" className="nova-team-card-edit-link" onClick={() => openEditPurchase(p)} aria-label="Modifier l'achat">
            <Pencil size={14} strokeWidth={1.75} />
          </button>
          <button type="button" className="nova-icon-btn" onClick={() => setDeletePurchaseTarget(p)} aria-label="Supprimer l'achat">
            <Trash2 size={14} strokeWidth={1.75} />
          </button>
        </span>
      ),
    },
  ];

  const supplierColumns: TableColumn<Supplier>[] = [
    { key: "name", label: "Nom", emphasis: "title" },
    { key: "category", label: "Catégorie", render: (s) => s.category || "—" },
    { key: "contact", label: "Contact", render: (s) => s.contact || s.email || s.phone || "—" },
    {
      key: "count",
      label: "Commandes",
      align: "right",
      render: (s) => s.purchases.length,
    },
    {
      key: "total",
      label: "Montant total",
      align: "right",
      render: (s) => `${s.purchases.reduce((sum, p) => sum + p.amount, 0).toLocaleString("fr-FR")} €`,
      emphasis: "amount",
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (s) => (
        <span className="nova-team-card-actions">
          <button type="button" className="nova-team-card-edit-link" onClick={() => openEditSupplier(s)} aria-label="Modifier le fournisseur">
            <Pencil size={14} strokeWidth={1.75} />
          </button>
          <button type="button" className="nova-icon-btn" onClick={() => setDeleteSupplierTarget(s)} aria-label="Supprimer le fournisseur">
            <Trash2 size={14} strokeWidth={1.75} />
          </button>
        </span>
      ),
    },
  ];

  return (
    <div className="nova-page">
      <header className="nova-page-header-row">
        <div>
          <h1>Achats</h1>
          <p className="nova-page-subtitle">
            {loading ? "…" : `${purchasesList.length} achat${purchasesList.length > 1 ? "s" : ""}`}
          </p>
        </div>
        {tab === "achats" && (
          <Button onClick={openAddPurchase}>
            <Plus size={16} strokeWidth={1.75} />
            Nouvel achat
          </Button>
        )}
        {tab === "fournisseurs" && (
          <Button onClick={openAddSupplier}>
            <Plus size={16} strokeWidth={1.75} />
            Nouveau fournisseur
          </Button>
        )}
      </header>

      {!loading && (
        <MetricBar
          items={[
            { label: "Achats ce mois", value: `${achatsCeMois.toLocaleString("fr-FR")} €` },
            { label: "Commandes en cours", value: commandesEnCours },
            { label: "Fournisseurs actifs", value: fournisseursActifs },
            { label: "Économies estimées", value: "0 €" },
          ]}
        />
      )}

      <Tabs
        tabs={[
          { key: "achats", label: "Achats" },
          { key: "fournisseurs", label: "Fournisseurs" },
          { key: "stock", label: "Stock" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {loading ? (
        <TableSkeleton columns={6} />
      ) : tab === "achats" ? (
        purchasesList.length === 0 ? (
          <EmptyState
            icon="achats"
            title="Aucun achat pour l'instant"
            description="Enregistrez vos commandes fournisseurs pour suivre vos dépenses chantier par chantier."
          />
        ) : (
          <Table columns={purchaseColumns} rows={purchasesList} emptyLabel="Aucun achat." pageSize={10} />
        )
      ) : tab === "fournisseurs" ? (
        (suppliers ?? []).length === 0 ? (
          <EmptyState
            icon="achats"
            title="Aucun fournisseur pour l'instant"
            description="Ajoutez vos fournisseurs pour leur rattacher des commandes."
          />
        ) : (
          <Table columns={supplierColumns} rows={suppliers ?? []} emptyLabel="Aucun fournisseur." pageSize={10} />
        )
      ) : (
        <EmptyState
          icon="achats"
          title="Suivi de stock — bientôt disponible"
          description="Le suivi des stocks et du matériel arrivera dans une prochaine mise à jour."
        />
      )}

      <EditModal
        open={addingSupplier}
        title="Nouveau fournisseur"
        onCancel={() => setAddingSupplier(false)}
        onSave={confirmAddSupplier}
        saving={savingSupplier}
      >
        <Field label="Nom" required value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} />
        <Field
          label="Catégorie"
          value={supplierForm.category}
          onChange={(e) => setSupplierForm({ ...supplierForm, category: e.target.value })}
          placeholder="Matériaux, outillage, électricité..."
        />
        <Field label="Contact" value={supplierForm.contact} onChange={(e) => setSupplierForm({ ...supplierForm, contact: e.target.value })} />
        <Field label="Email" type="email" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} />
        <Field label="Téléphone" value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} />
      </EditModal>

      <EditModal
        open={editSupplierTarget !== null}
        title="Modifier le fournisseur"
        onCancel={() => setEditSupplierTarget(null)}
        onSave={confirmEditSupplier}
        saving={savingSupplier}
      >
        <Field label="Nom" required value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} />
        <Field label="Catégorie" value={supplierForm.category} onChange={(e) => setSupplierForm({ ...supplierForm, category: e.target.value })} />
        <Field label="Contact" value={supplierForm.contact} onChange={(e) => setSupplierForm({ ...supplierForm, contact: e.target.value })} />
        <Field label="Email" type="email" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} />
        <Field label="Téléphone" value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} />
      </EditModal>

      <ConfirmModal
        open={deleteSupplierTarget !== null}
        itemLabel={deleteSupplierTarget ? `le fournisseur « ${deleteSupplierTarget.name} » (et ses commandes associées)` : ""}
        onConfirm={confirmDeleteSupplier}
        onCancel={() => setDeleteSupplierTarget(null)}
        confirming={deletingSupplier}
      />

      <EditModal
        open={addingPurchase}
        title="Nouvel achat"
        onCancel={() => setAddingPurchase(false)}
        onSave={confirmAddPurchase}
        saving={savingPurchase}
      >
        <SelectField
          label="Fournisseur"
          required
          value={purchaseForm.supplierId}
          onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierId: e.target.value })}
        >
          <option value="">Sélectionner...</option>
          {(suppliers ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Chantier"
          value={purchaseForm.projectId}
          onChange={(e) => setPurchaseForm({ ...purchaseForm, projectId: e.target.value })}
        >
          <option value="">Aucun chantier</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </SelectField>
        <Field
          label="Description"
          required
          value={purchaseForm.description}
          onChange={(e) => setPurchaseForm({ ...purchaseForm, description: e.target.value })}
          placeholder="Carrelage salle de bain, 40m²"
        />
        <Field
          label="Montant (€)"
          type="number"
          min="0"
          step="1"
          value={purchaseForm.amount}
          onChange={(e) => setPurchaseForm({ ...purchaseForm, amount: e.target.value })}
        />
        <SelectField label="Statut" value={purchaseForm.status} onChange={(e) => setPurchaseForm({ ...purchaseForm, status: e.target.value })}>
          <option value="en_attente">En attente</option>
          <option value="en_cours">En cours</option>
          <option value="recu">Reçu</option>
          <option value="annule">Annulé</option>
        </SelectField>
        <DatePickerField
          label="Date de commande"
          value={purchaseForm.orderDate}
          onChange={(value) => setPurchaseForm({ ...purchaseForm, orderDate: value })}
        />
        <DatePickerField
          label="Date attendue (optionnel)"
          value={purchaseForm.expectedDate}
          onChange={(value) => setPurchaseForm({ ...purchaseForm, expectedDate: value })}
        />
      </EditModal>

      <EditModal
        open={editPurchaseTarget !== null}
        title="Modifier l'achat"
        onCancel={() => setEditPurchaseTarget(null)}
        onSave={confirmEditPurchase}
        saving={savingPurchase}
      >
        <SelectField
          label="Fournisseur"
          required
          value={purchaseForm.supplierId}
          onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierId: e.target.value })}
        >
          <option value="">Sélectionner...</option>
          {(suppliers ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Chantier"
          value={purchaseForm.projectId}
          onChange={(e) => setPurchaseForm({ ...purchaseForm, projectId: e.target.value })}
        >
          <option value="">Aucun chantier</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </SelectField>
        <Field
          label="Description"
          required
          value={purchaseForm.description}
          onChange={(e) => setPurchaseForm({ ...purchaseForm, description: e.target.value })}
        />
        <Field
          label="Montant (€)"
          type="number"
          min="0"
          step="1"
          value={purchaseForm.amount}
          onChange={(e) => setPurchaseForm({ ...purchaseForm, amount: e.target.value })}
        />
        <SelectField label="Statut" value={purchaseForm.status} onChange={(e) => setPurchaseForm({ ...purchaseForm, status: e.target.value })}>
          <option value="en_attente">En attente</option>
          <option value="en_cours">En cours</option>
          <option value="recu">Reçu</option>
          <option value="annule">Annulé</option>
        </SelectField>
        <DatePickerField
          label="Date de commande"
          value={purchaseForm.orderDate}
          onChange={(value) => setPurchaseForm({ ...purchaseForm, orderDate: value })}
        />
        <DatePickerField
          label="Date attendue (optionnel)"
          value={purchaseForm.expectedDate}
          onChange={(value) => setPurchaseForm({ ...purchaseForm, expectedDate: value })}
        />
      </EditModal>

      <ConfirmModal
        open={deletePurchaseTarget !== null}
        itemLabel={deletePurchaseTarget ? `l'achat « ${deletePurchaseTarget.description} »` : ""}
        onConfirm={confirmDeletePurchase}
        onCancel={() => setDeletePurchaseTarget(null)}
        confirming={deletingPurchase}
      />
    </div>
  );
}
