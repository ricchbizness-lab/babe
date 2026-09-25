"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Banknote, BookOpen, Building2, Download, FileText, MessageCircle, Pencil, Plus, Printer, Send, Trash2, X } from "lucide-react";
import {
  BackLink,
  Badge,
  Breadcrumb,
  Card,
  CardTitle,
  Button,
  ConfirmModal,
  EditModal,
  EmptyState,
  Field,
  ProgressBar,
  RelanceIndicator,
  RelanceModal,
  SearchInput,
  SelectField,
  Skeleton,
  Table,
  Tabs,
  TextareaField,
  Timestamp,
  useToast,
  type TableColumn,
} from "@/components/ui";
import { daysSinceSent } from "@/lib/relance";
import { fetchWithAuth } from "@/lib/fetchClient";
import { computeDevisTotals, lineTotalHT, tvaByRate } from "@/lib/devisTotals";
import { suggestedTvaRate, TVA_MENTION_LEGALE, TVA_RATES, TYPE_TRAVAUX_TVA_LABEL } from "@/lib/tva";
import { OUVRAGE_TYPE_LABEL } from "@/lib/validation";
import { isInternationalPhone } from "@/lib/whatsapp";

type DevisLineType = "prestation" | "materiel" | "deplacement" | "maindoeuvre" | "autre";

type DevisLine = {
  id: string;
  type: DevisLineType;
  description: string;
  quantite: number;
  unite: string | null;
  prixUnitaire: number;
  tva: number;
};

type DevisDetail = {
  id: string;
  label: string;
  description: string | null;
  amount: number | null;
  status: string;
  paymentStatus: string;
  content: string;
  remise: number | null;
  notesDevis: string | null;
  typeTravauxTVA: string;
  clientTypeTVA: string;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string; typeClient: string; phone: string | null; email: string | null } | null;
  lines: DevisLine[];
};

type SituationStatut = "brouillon" | "envoyee" | "payee";

type SituationRow = {
  id: string;
  numero: number;
  pourcentageAvancement: number;
  montantHT: number;
  statut: SituationStatut;
  createdAt: string;
};

const SITUATION_STATUT_LABEL: Record<SituationStatut, string> = {
  brouillon: "Brouillon",
  envoyee: "Envoyée",
  payee: "Payée",
};
const SITUATION_STATUT_TONE: Record<SituationStatut, "neutral" | "blue" | "success"> = {
  brouillon: "neutral",
  envoyee: "blue",
  payee: "success",
};

type AcompteStatut = "en_attente" | "recu" | "annule";

type AcompteRow = {
  id: string;
  pourcentage: number;
  montantHT: number;
  statut: AcompteStatut;
  createdAt: string;
};

const ACOMPTE_STATUT_LABEL: Record<AcompteStatut, string> = {
  en_attente: "En attente",
  recu: "Reçu",
  annule: "Annulé",
};
const ACOMPTE_STATUT_TONE: Record<AcompteStatut, "amber" | "success" | "neutral"> = {
  en_attente: "amber",
  recu: "success",
  annule: "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  accepte: "Accepté",
  refuse: "Refusé",
};
const STATUS_TONE: Record<string, "neutral" | "teal" | "blue" | "success" | "danger"> = {
  brouillon: "neutral",
  envoye: "blue",
  accepte: "success",
  refuse: "danger",
};

const CLIENT_TYPE_LABEL: Record<string, string> = {
  particulier: "Particulier",
  professionnel: "Pro",
  collectivite: "Collectivité",
};
const CLIENT_TYPE_TONE: Record<string, "neutral" | "teal" | "blue"> = {
  particulier: "neutral",
  professionnel: "teal",
  collectivite: "blue",
};

const STATUS_ACTIONS: { status: string; label: string; variant: "primary" | "success" | "danger" }[] = [
  { status: "envoye", label: "Marquer comme envoyé", variant: "primary" },
  { status: "accepte", label: "Marquer comme accepté", variant: "success" },
  { status: "refuse", label: "Marquer comme refusé", variant: "danger" },
];

const LINE_TYPE_LABEL: Record<DevisLineType, string> = {
  prestation: "Prestation",
  materiel: "Matériel",
  deplacement: "Déplacement",
  maindoeuvre: "Main d'œuvre",
  autre: "Autre",
};
const LINE_TYPE_TONE: Record<DevisLineType, "neutral" | "teal" | "amber" | "success"> = {
  prestation: "teal",
  materiel: "amber",
  deplacement: "neutral",
  maindoeuvre: "success",
  autre: "neutral",
};

type OuvrageOption = {
  id: string;
  label: string;
  type: string;
  unite: string;
  prixUnitaireHT: number;
  tvaDefaut: number;
};

type LineFormState = {
  type: DevisLineType;
  description: string;
  quantite: string;
  unite: string;
  prixUnitaire: string;
  tva: string;
};

const EMPTY_LINE_FORM: LineFormState = {
  type: "prestation",
  description: "",
  quantite: "1",
  unite: "",
  prixUnitaire: "",
  tva: "20",
};

export default function DevisDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [devis, setDevis] = useState<DevisDetail | null>(null);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [relanceMessage, setRelanceMessage] = useState<string | null>(null);
  const [generatingRelance, setGeneratingRelance] = useState(false);
  const [relanceSending, setRelanceSending] = useState(false);
  const [relanceConfirming, setRelanceConfirming] = useState(false);
  const [resendConfigured, setResendConfigured] = useState(true);
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);
  const [chantierPromptDismissed, setChantierPromptDismissed] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendForm, setSendForm] = useState({ to: "", subject: "", message: "" });
  const [sendConfirming, setSendConfirming] = useState(false);
  const [sendingDevis, setSendingDevis] = useState(false);

  const [lineForm, setLineForm] = useState<LineFormState | null>(null);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [savingLine, setSavingLine] = useState(false);
  const [deleteLineTarget, setDeleteLineTarget] = useState<DevisLine | null>(null);
  const [deletingLine, setDeletingLine] = useState(false);

  const [remiseInput, setRemiseInput] = useState("0");
  const [notesInput, setNotesInput] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [requestingPayment, setRequestingPayment] = useState(false);

  const [devisTab, setDevisTab] = useState<"lignes" | "situations">("lignes");
  const [situations, setSituations] = useState<SituationRow[] | null>(null);
  const [situationForm, setSituationForm] = useState<{ pourcentageAvancement: string; montantHT: string } | null>(null);
  const [savingSituation, setSavingSituation] = useState(false);
  const [deleteSituationTarget, setDeleteSituationTarget] = useState<SituationRow | null>(null);
  const [deletingSituation, setDeletingSituation] = useState(false);
  const [updatingSituationId, setUpdatingSituationId] = useState<string | null>(null);

  const [acomptes, setAcomptes] = useState<AcompteRow[] | null>(null);
  const [acompteModalOpen, setAcompteModalOpen] = useState(false);
  const [acomptePourcentage, setAcomptePourcentage] = useState(30);
  const [creatingAcompte, setCreatingAcompte] = useState(false);
  const [updatingAcompteId, setUpdatingAcompteId] = useState<string | null>(null);
  const [payingAcompteId, setPayingAcompteId] = useState<string | null>(null);

  const [ouvragePickerOpen, setOuvragePickerOpen] = useState(false);
  const [ouvrageOptions, setOuvrageOptions] = useState<OuvrageOption[] | null>(null);
  const [ouvrageQuery, setOuvrageQuery] = useState("");

  const [attestationTva, setAttestationTva] = useState<{ id: string } | null | undefined>(undefined);

  useEffect(() => {
    fetchWithAuth(`/api/devis/${params.id}`).then(async (res) => {
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(res.status === 404 || res.status === 403 ? "Devis introuvable." : data.error || "Erreur lors du chargement du devis.");
        return;
      }
      const data = await res.json();
      setDevis(data.devis);
      setRemiseInput(String(data.devis.remise ?? 0));
      setNotesInput(data.devis.notesDevis || "");
    });
    fetchWithAuth("/api/relances")
      .then((res) => res.json())
      .then((data) => setResendConfigured(!!data.resendConfigured))
      .catch(() => {});
    fetchWithAuth("/api/business")
      .then((res) => res.json())
      .then((data) => setBusinessName(data.business?.name || ""))
      .catch(() => {});
  }, [params.id]);

  useEffect(() => {
    if (devis?.status !== "accepte") return;
    fetchWithAuth(`/api/devis/${params.id}/situations`)
      .then((res) => res.json())
      .then((data) => setSituations(data.situations ?? []));
    fetchWithAuth(`/api/devis/${params.id}/acomptes`)
      .then((res) => res.json())
      .then((data) => setAcomptes(data.acomptes ?? []));
  }, [params.id, devis?.status]);

  useEffect(() => {
    if (!ouvragePickerOpen || ouvrageOptions !== null) return;
    fetchWithAuth("/api/ouvrages")
      .then((res) => res.json())
      .then((data) => setOuvrageOptions(data.ouvrages ?? []));
  }, [ouvragePickerOpen, ouvrageOptions]);

  useEffect(() => {
    if (!devis || !devis.lines.some((l) => l.tva === 10)) return;
    fetchWithAuth("/api/attestations")
      .then((res) => res.json())
      .then((data) => {
        const match = (data.attestations ?? []).find((a: { devisId?: string; id: string }) => a.devisId === devis.id);
        setAttestationTva(match ? { id: match.id } : null);
      });
  }, [devis]);

  // Retour de Stripe Checkout (paiement direct depuis un devis accepté, ou
  // paiement d'un acompte spécifique — distingué par acompteId dans l'URL).
  useEffect(() => {
    if (!devis) return;
    const payment = searchParams.get("payment");
    const acompteIdParam = searchParams.get("acompteId");
    if (payment === "success" && acompteIdParam) {
      fetchWithAuth(`/api/acomptes/${acompteIdParam}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: "recu" }),
      }).then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setAcomptes((prev) => (prev ? prev.map((a) => (a.id === acompteIdParam ? data.acompte : a)) : prev));
          toast.success("Paiement de l'acompte reçu");
        }
      });
      router.replace(`/dashboard/devis/${devis.id}`);
      return;
    }
    if (payment === "success" && devis.paymentStatus !== "payee") {
      fetchWithAuth(`/api/devis/${devis.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: "payee" }),
      }).then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setDevis(data.devis);
          toast.success("Paiement reçu");
          router.refresh();
        }
      });
      router.replace(`/dashboard/devis/${devis.id}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devis?.id, searchParams]);

  async function handleStatusChange(status: string) {
    if (!devis) return;
    setUpdating(true);
    try {
      const res = await fetchWithAuth(`/api/devis/${devis.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        setDevis(data.devis);
        toast.success(`Devis marqué comme ${STATUS_LABEL[status]?.toLowerCase() || status}`);
        if (res.headers.get("X-Email-Error") === "true") {
          toast.error("Statut mis à jour mais l'email n'a pas pu être envoyé — vérifiez votre configuration Resend.");
        }
        router.refresh();
        return;
      }
      toast.error("Erreur lors de la mise à jour du devis.");
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setUpdating(false);
    }
  }

  async function handleRequestPayment() {
    if (!devis) return;
    setRequestingPayment(true);
    try {
      const res = await fetchWithAuth("/api/stripe/payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ devisId: devis.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Impossible de créer le lien de paiement.");
        return;
      }
      const data = await res.json();
      window.location.href = data.url;
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setRequestingPayment(false);
    }
  }

  async function handleRelance() {
    if (!devis) return;
    setGeneratingRelance(true);
    setRelanceMessage(null);
    setRelanceConfirming(false);
    try {
      const res = await fetchWithAuth("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "reponse_client",
          input: {
            context: "relance devis",
            clientName: devis.client?.name || "ce client",
            devisLabel: devis.label,
            montant: devis.amount,
            joursEcoules: daysSinceSent(devis.updatedAt),
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Erreur lors de la génération du message de relance.");
        return;
      }
      const data = await res.json();
      setRelanceMessage(data.result || "");
      toast.success("Message de relance généré");
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setGeneratingRelance(false);
    }
  }

  function closeRelanceModal() {
    setRelanceMessage(null);
    setRelanceConfirming(false);
  }

  async function handleSendRelanceEmail() {
    if (!devis?.client?.email || !relanceMessage) return;
    setRelanceSending(true);
    try {
      const res = await fetchWithAuth("/api/relances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ devisId: devis.id, channel: "email", message: relanceMessage }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Impossible d'envoyer l'email.");
        setRelanceConfirming(false);
        return;
      }
      toast.success(`Email envoyé à ${devis.client.email}`);
      closeRelanceModal();
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
      setRelanceConfirming(false);
    } finally {
      setRelanceSending(false);
    }
  }

  async function handleSendWhatsapp() {
    if (!devis || !devis.client?.phone) return;
    setSendingWhatsapp(true);
    try {
      const link = `${window.location.origin}/dashboard/devis/${devis.id}/imprimer`;
      const message = `Bonjour ${devis.client.name}, voici le lien de votre devis « ${devis.label} »${
        devis.amount != null ? ` (${devis.amount.toLocaleString("fr-FR")} €)` : ""
      } : ${link}\nN'hésitez pas à nous contacter pour toute question.`;
      const res = await fetchWithAuth("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: devis.client.phone, message }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Impossible d'envoyer le message WhatsApp.");
        return;
      }
      toast.success("Devis envoyé via WhatsApp");
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setSendingWhatsapp(false);
    }
  }

  function openSendModal() {
    if (!devis) return;
    const devisTotals = computeDevisTotals(devis.lines, devis.remise || 0);
    const amountTTC = devis.lines.length > 0 ? devisTotals.totalTTC : devis.amount != null ? devis.amount * 1.2 : 0;
    setSendForm({
      to: devis.client?.email || "",
      subject: `Devis ${devis.label} — ${businessName}`,
      message: `Bonjour ${devis.client?.name || ""},\nVeuillez trouver ci-joint notre devis ${devis.label} d'un montant de ${amountTTC.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €.\nCe devis est valable 30 jours.\nN'hésitez pas à nous contacter.\nCordialement, ${businessName}`,
    });
    setSendConfirming(false);
    setSendModalOpen(true);
  }

  function closeSendModal() {
    setSendModalOpen(false);
    setSendConfirming(false);
  }

  async function handleCopySendMessage() {
    await navigator.clipboard.writeText(sendForm.message);
    toast.success("Message copié !");
  }

  async function handleSendDevis() {
    if (!devis) return;
    setSendingDevis(true);
    try {
      const res = await fetchWithAuth(`/api/devis/${devis.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sendForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Impossible d'envoyer le devis.");
        setSendConfirming(false);
        return;
      }
      const data = await res.json();
      setDevis(data.devis);
      toast.success(`Devis envoyé à ${sendForm.to}`);
      closeSendModal();
      router.refresh();
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
      setSendConfirming(false);
    } finally {
      setSendingDevis(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      const res = await fetchWithAuth(`/api/devis/${params.id}`, { method: "DELETE" });
      setDeleting(false);
      if (res.ok) {
        toast.success("Devis supprimé");
        router.refresh();
        router.push("/dashboard/devis");
        return;
      }
      toast.error("Erreur lors de la suppression du devis.");
      setConfirmingDelete(false);
    } catch {
      setDeleting(false);
      toast.error("Impossible de joindre le serveur — réessayez.");
      setConfirmingDelete(false);
    }
  }

  function openAddLine() {
    if (!devis) return;
    setEditingLineId(null);
    setLineForm({ ...EMPTY_LINE_FORM, tva: String(suggestedTvaRate(devis.typeTravauxTVA, devis.clientTypeTVA)) });
  }

  function openEditLine(line: DevisLine) {
    setEditingLineId(line.id);
    setLineForm({
      type: line.type,
      description: line.description,
      quantite: String(line.quantite),
      unite: line.unite || "",
      prixUnitaire: String(line.prixUnitaire),
      tva: String(line.tva),
    });
  }

  function closeLineModal() {
    setLineForm(null);
    setEditingLineId(null);
  }

  function selectOuvrage(o: OuvrageOption) {
    setLineForm((prev) =>
      prev
        ? {
            ...prev,
            description: o.label,
            unite: o.unite,
            prixUnitaire: String(o.prixUnitaireHT),
            tva: String(o.tvaDefaut),
          }
        : prev
    );
    setOuvragePickerOpen(false);
    setOuvrageQuery("");
  }

  async function confirmLineSave() {
    if (!devis || !lineForm) return;
    if (!lineForm.description.trim()) {
      toast.error("La description est requise.");
      return;
    }
    const payload = {
      type: lineForm.type,
      description: lineForm.description,
      quantite: Number(lineForm.quantite) || 0,
      unite: lineForm.unite || undefined,
      prixUnitaire: Number(lineForm.prixUnitaire) || 0,
      tva: Number(lineForm.tva) || 0,
    };
    setSavingLine(true);
    try {
      const url = editingLineId ? `/api/devis-lines/${editingLineId}` : `/api/devis/${devis.id}/lines`;
      const res = await fetchWithAuth(url, {
        method: editingLineId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Impossible d'enregistrer cette ligne.");
        return;
      }
      const data = await res.json();
      const savedLine: DevisLine = data.line;
      setDevis((prev) =>
        prev
          ? {
              ...prev,
              lines: editingLineId
                ? prev.lines.map((l) => (l.id === savedLine.id ? savedLine : l))
                : [...prev.lines, savedLine],
            }
          : prev
      );
      toast.success(editingLineId ? "Ligne modifiée" : "Ligne ajoutée");
      router.refresh();
      closeLineModal();
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setSavingLine(false);
    }
  }

  async function updateLineTva(line: DevisLine, tva: number) {
    if (!devis) return;
    const previousLines = devis.lines;
    setDevis((prev) => (prev ? { ...prev, lines: prev.lines.map((l) => (l.id === line.id ? { ...l, tva } : l)) } : prev));
    try {
      const res = await fetchWithAuth(`/api/devis-lines/${line.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tva }),
      });
      if (!res.ok) {
        setDevis((prev) => (prev ? { ...prev, lines: previousLines } : prev));
        toast.error("Impossible de mettre à jour le taux de TVA de cette ligne.");
        return;
      }
      toast.success("Taux de TVA mis à jour");
      router.refresh();
    } catch {
      setDevis((prev) => (prev ? { ...prev, lines: previousLines } : prev));
      toast.error("Impossible de joindre le serveur — réessayez.");
    }
  }

  async function confirmDeleteLine() {
    if (!deleteLineTarget) return;
    setDeletingLine(true);
    try {
      const res = await fetchWithAuth(`/api/devis-lines/${deleteLineTarget.id}`, { method: "DELETE" });
      setDeletingLine(false);
      if (res.ok) {
        const deletedId = deleteLineTarget.id;
        setDevis((prev) => (prev ? { ...prev, lines: prev.lines.filter((l) => l.id !== deletedId) } : prev));
        toast.success("Ligne supprimée");
        router.refresh();
      } else {
        toast.error("Erreur lors de la suppression de la ligne.");
      }
    } catch {
      setDeletingLine(false);
      toast.error("Impossible de joindre le serveur — réessayez.");
    }
    setDeleteLineTarget(null);
  }

  function montantTotalDevisHT(d: DevisDetail): number {
    return d.lines.length > 0 ? computeDevisTotals(d.lines, d.remise || 0).totalHT : d.amount ?? 0;
  }

  function openCreateSituation() {
    setSituationForm({ pourcentageAvancement: "0", montantHT: "0" });
  }

  function handleSituationPctChange(pct: string) {
    if (!devis) return;
    const montant = (Number(pct) / 100) * montantTotalDevisHT(devis);
    setSituationForm({ pourcentageAvancement: pct, montantHT: montant.toFixed(2) });
  }

  async function confirmSituationSave() {
    if (!devis || !situationForm) return;
    setSavingSituation(true);
    try {
      const res = await fetchWithAuth(`/api/devis/${devis.id}/situations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pourcentageAvancement: Number(situationForm.pourcentageAvancement) || 0,
          montantHT: Number(situationForm.montantHT) || 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Impossible de créer la situation.");
        return;
      }
      const data = await res.json();
      setSituations((prev) => [...(prev ?? []), data.situation]);
      toast.success("Situation créée");
      router.refresh();
      setSituationForm(null);
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setSavingSituation(false);
    }
  }

  async function updateSituationStatut(situation: SituationRow, statut: SituationStatut) {
    setUpdatingSituationId(situation.id);
    try {
      const res = await fetchWithAuth(`/api/situations/${situation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut }),
      });
      if (!res.ok) {
        toast.error("Impossible de mettre à jour le statut de cette situation.");
        return;
      }
      const data = await res.json();
      setSituations((prev) => (prev ? prev.map((s) => (s.id === situation.id ? data.situation : s)) : prev));
      toast.success(`Situation marquée comme ${SITUATION_STATUT_LABEL[statut].toLowerCase()}`);
      router.refresh();
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setUpdatingSituationId(null);
    }
  }

  async function confirmDeleteSituation() {
    if (!deleteSituationTarget) return;
    setDeletingSituation(true);
    try {
      const res = await fetchWithAuth(`/api/situations/${deleteSituationTarget.id}`, { method: "DELETE" });
      setDeletingSituation(false);
      if (res.ok) {
        const deletedId = deleteSituationTarget.id;
        setSituations((prev) => (prev ? prev.filter((s) => s.id !== deletedId) : prev));
        toast.success("Situation supprimée");
        router.refresh();
      } else {
        toast.error("Erreur lors de la suppression de la situation.");
      }
    } catch {
      setDeletingSituation(false);
      toast.error("Impossible de joindre le serveur — réessayez.");
    }
    setDeleteSituationTarget(null);
  }

  function openAcompteModal() {
    setAcomptePourcentage(30);
    setAcompteModalOpen(true);
  }

  async function confirmCreateAcompte() {
    if (!devis) return;
    setCreatingAcompte(true);
    try {
      const res = await fetchWithAuth(`/api/devis/${devis.id}/acomptes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pourcentage: acomptePourcentage }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Impossible de créer l'acompte.");
        return;
      }
      const data = await res.json();
      setAcomptes((prev) => [...(prev ?? []), data.acompte]);
      toast.success("Acompte créé");
      setAcompteModalOpen(false);
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setCreatingAcompte(false);
    }
  }

  async function updateAcompteStatut(acompte: AcompteRow, statut: AcompteStatut) {
    setUpdatingAcompteId(acompte.id);
    try {
      const res = await fetchWithAuth(`/api/acomptes/${acompte.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut }),
      });
      if (!res.ok) {
        toast.error("Impossible de mettre à jour cet acompte.");
        return;
      }
      const data = await res.json();
      setAcomptes((prev) => (prev ? prev.map((a) => (a.id === acompte.id ? data.acompte : a)) : prev));
      toast.success(`Acompte marqué comme ${ACOMPTE_STATUT_LABEL[statut].toLowerCase()}`);
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setUpdatingAcompteId(null);
    }
  }

  async function handlePayAcompte(acompte: AcompteRow) {
    if (!devis) return;
    setPayingAcompteId(acompte.id);
    try {
      const res = await fetchWithAuth("/api/stripe/payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ devisId: devis.id, acompteId: acompte.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Impossible de créer le lien de paiement.");
        return;
      }
      const data = await res.json();
      window.location.href = data.url;
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setPayingAcompteId(null);
    }
  }

  async function handleSaveSettings() {
    if (!devis) return;
    setSavingSettings(true);
    try {
      const res = await fetchWithAuth(`/api/devis/${devis.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remise: Number(remiseInput) || 0,
          notesDevis: notesInput,
        }),
      });
      if (!res.ok) {
        toast.error("Impossible d'enregistrer la remise et les notes.");
        return;
      }
      const data = await res.json();
      setDevis(data.devis);
      toast.success("Remise et notes enregistrées");
      router.refresh();
    } catch {
      toast.error("Impossible de joindre le serveur — réessayez.");
    } finally {
      setSavingSettings(false);
    }
  }

  if (error) {
    return (
      <div className="nova-page">
        <BackLink href="/dashboard/devis" label="Retour aux devis" />
        <p className="error">{error}</p>
      </div>
    );
  }

  if (!devis) {
    return (
      <div className="nova-page">
        <BackLink href="/dashboard/devis" label="Retour aux devis" />
        <Card>
          <p className="nova-page-subtitle">Chargement...</p>
        </Card>
      </div>
    );
  }

  const remisePct = devis.remise || 0;
  const totals = computeDevisTotals(devis.lines, remisePct);
  const tvaBuckets = tvaByRate(devis.lines, remisePct);
  const mentionsLegales = tvaBuckets
    .map((b) => TVA_MENTION_LEGALE[String(b.rate)])
    .filter((m): m is string => Boolean(m));

  const lineColumns: TableColumn<DevisLine>[] = [
    {
      key: "type",
      label: "Type",
      render: (l) => <Badge tone={LINE_TYPE_TONE[l.type]}>{LINE_TYPE_LABEL[l.type] || l.type}</Badge>,
    },
    { key: "description", label: "Description" },
    { key: "quantite", label: "Qté", align: "right", render: (l) => l.quantite.toLocaleString("fr-FR") },
    { key: "unite", label: "Unité", render: (l) => l.unite || "—" },
    {
      key: "prixUnitaire",
      label: "Prix unitaire HT",
      align: "right",
      render: (l) => `${l.prixUnitaire.toLocaleString("fr-FR")} €`,
    },
    {
      key: "tva",
      label: "TVA %",
      align: "right",
      render: (l) => (
        <select
          className="nova-inline-select"
          value={String(l.tva)}
          onChange={(e) => updateLineTva(l, Number(e.target.value))}
          aria-label={`Taux de TVA pour ${l.description}`}
        >
          {!TVA_RATES.includes(l.tva as (typeof TVA_RATES)[number]) && <option value={String(l.tva)}>{l.tva}%</option>}
          {TVA_RATES.map((rate) => (
            <option key={rate} value={rate}>
              {rate}%
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "totalHT",
      label: "Total HT",
      align: "right",
      render: (l) => `${lineTotalHT(l).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`,
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (l) => (
        <div className="nova-table-row-actions">
          <button
            type="button"
            className="nova-icon-btn nova-icon-btn-edit"
            onClick={() => openEditLine(l)}
            aria-label="Modifier la ligne"
          >
            <Pencil size={14} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className="nova-icon-btn"
            onClick={() => setDeleteLineTarget(l)}
            aria-label="Supprimer la ligne"
          >
            <Trash2 size={14} strokeWidth={1.75} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="nova-page">
      <Breadcrumb items={[{ label: "Devis", href: "/dashboard/devis" }, { label: devis.label }]} />

      <header className="nova-page-header-row">
        <div>
          <h1>{devis.label}</h1>
          <p className="nova-page-subtitle">
            {devis.client ? (
              <>
                <Link href={`/dashboard/clients/${devis.client.id}`} className="nova-inline-link">
                  {devis.client.name}
                </Link>{" "}
                <Badge tone={CLIENT_TYPE_TONE[devis.client.typeClient] || "neutral"}>
                  {CLIENT_TYPE_LABEL[devis.client.typeClient] || devis.client.typeClient}
                </Badge>
              </>
            ) : (
              "Sans client rattaché"
            )}{" "}
            <Badge tone="neutral">{TYPE_TRAVAUX_TVA_LABEL[devis.typeTravauxTVA] || devis.typeTravauxTVA}</Badge>
            {devis.amount != null && <> · {devis.amount.toLocaleString("fr-FR")} €</>}
          </p>
        </div>
        <div className="nova-page-header-badges">
          <div className="nova-devis-status-badge">
            <Badge tone={STATUS_TONE[devis.status] || "neutral"}>{STATUS_LABEL[devis.status] || devis.status}</Badge>
          </div>
          {devis.paymentStatus === "payee" && <Badge tone="success">Payé</Badge>}
          <RelanceIndicator status={devis.status} updatedAt={devis.updatedAt} />
        </div>
      </header>

      <div className="nova-status-actions">
        <Button variant="secondary" onClick={openSendModal}>
          <Send size={16} strokeWidth={1.75} />
          Envoyer au client
        </Button>
        {STATUS_ACTIONS.filter((a) => a.status !== devis.status).map((a) => (
          <Button key={a.status} variant={a.variant} disabled={updating} onClick={() => handleStatusChange(a.status)}>
            {a.label}
          </Button>
        ))}
        {devis.status === "envoye" && (
          <Button variant="ghost" disabled={updating} onClick={() => handleStatusChange("brouillon")}>
            Revenir en brouillon
          </Button>
        )}
        {devis.status === "accepte" && (
          <Link href={`/dashboard/facturation/${devis.id}`} className="nova-btn nova-btn-secondary">
            <FileText size={16} strokeWidth={1.75} />
            Voir la facture
          </Link>
        )}
        <Link href={`/dashboard/devis/${devis.id}/imprimer`} className="nova-btn nova-btn-secondary">
          <Printer size={16} strokeWidth={1.75} />
          Imprimer le devis
        </Link>
        {devis.status === "envoye" && (
          <Button variant="secondary" disabled={generatingRelance} onClick={handleRelance}>
            <MessageCircle size={16} strokeWidth={1.75} />
            {generatingRelance ? "Génération..." : "Relancer le client"}
          </Button>
        )}
        {devis.status === "envoye" && devis.client?.phone && isInternationalPhone(devis.client.phone) && (
          <Button variant="secondary" disabled={sendingWhatsapp} onClick={handleSendWhatsapp}>
            <Send size={16} strokeWidth={1.75} />
            {sendingWhatsapp ? "Envoi..." : "Envoyer via WhatsApp"}
          </Button>
        )}
        {devis.status === "accepte" && devis.amount != null && devis.paymentStatus !== "payee" && (
          <Button variant="secondary" disabled={requestingPayment} onClick={handleRequestPayment}>
            <Banknote size={16} strokeWidth={1.75} />
            {requestingPayment ? "Redirection..." : "Demander le paiement"}
          </Button>
        )}
        <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
          <Trash2 size={16} strokeWidth={1.75} />
          Supprimer
        </Button>
      </div>

      {devis.status === "accepte" && !chantierPromptDismissed && (
        <Card accent={false} className="nova-ai-zone">
          <p className="nova-ai-content">Ce devis est accepté. Souhaitez-vous créer le chantier correspondant ?</p>
          <div className="nova-status-actions">
            <Link
              href={`/dashboard/chantiers/nouveau?name=${encodeURIComponent(devis.label)}${
                devis.client ? `&clientId=${devis.client.id}` : ""
              }`}
              className="nova-btn nova-btn-primary"
            >
              <Building2 size={16} strokeWidth={1.75} />
              Créer le chantier
            </Link>
            <Button variant="ghost" onClick={() => setChantierPromptDismissed(true)}>
              Plus tard
            </Button>
          </div>
        </Card>
      )}

      {(generatingRelance || relanceMessage) && (
        <RelanceModal
          clientName={devis.client?.name || "client"}
          clientEmail={devis.client?.email || null}
          loading={generatingRelance}
          text={relanceMessage || ""}
          onTextChange={setRelanceMessage}
          onClose={closeRelanceModal}
          confirming={relanceConfirming}
          onRequestConfirm={() => setRelanceConfirming(true)}
          onCancelConfirm={() => setRelanceConfirming(false)}
          onConfirmSend={handleSendRelanceEmail}
          sending={relanceSending}
          resendConfigured={resendConfigured}
        />
      )}

      {sendModalOpen && (
        <div className="nova-modal-overlay" onClick={sendingDevis ? undefined : closeSendModal}>
          <div
            className="nova-modal nova-modal-edit"
            role="dialog"
            aria-modal="true"
            aria-label="Envoyer le devis au client"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="nova-planning-detail-header">
              <h3 className="nova-modal-title">Envoyer le devis</h3>
              <button type="button" className="nova-icon-btn" onClick={closeSendModal} aria-label="Fermer" disabled={sendingDevis}>
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>

            <div className="nova-modal-body">
              {sendConfirming ? (
                <p className="nova-modal-message">Envoyer à {sendForm.to} ?</p>
              ) : (
                <>
                  <Field
                    label="Destinataire *"
                    type="email"
                    required
                    value={sendForm.to}
                    onChange={(e) => setSendForm({ ...sendForm, to: e.target.value })}
                    placeholder="client@exemple.fr"
                  />
                  <Field
                    label="Objet *"
                    required
                    value={sendForm.subject}
                    onChange={(e) => setSendForm({ ...sendForm, subject: e.target.value })}
                  />
                  <div className="nova-field">
                    <label>Message *</label>
                    <textarea
                      className="nova-relance-textarea"
                      value={sendForm.message}
                      onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
                      rows={10}
                      aria-label="Message d'envoi"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="nova-modal-actions">
              {sendConfirming ? (
                <>
                  <Button type="button" variant="ghost" onClick={() => setSendConfirming(false)} disabled={sendingDevis}>
                    Annuler
                  </Button>
                  <Button type="button" onClick={handleSendDevis} disabled={sendingDevis}>
                    {sendingDevis ? "Envoi..." : "Confirmer l'envoi"}
                  </Button>
                </>
              ) : !resendConfigured ? (
                <>
                  <Button type="button" variant="ghost" onClick={closeSendModal}>
                    Annuler
                  </Button>
                  <Button type="button" variant="secondary" onClick={handleCopySendMessage}>
                    Copier
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="ghost" onClick={closeSendModal}>
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setSendConfirming(true)}
                    disabled={!sendForm.to.trim() || !sendForm.subject.trim() || !sendForm.message.trim()}
                  >
                    Envoyer →
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {devis.description && (
        <Card>
          <CardTitle>Description de la prestation</CardTitle>
          <p className="nova-card-text">{devis.description}</p>
        </Card>
      )}

      {devis.status === "accepte" && (
        <Tabs
          tabs={[
            { key: "lignes", label: "Lignes du devis" },
            { key: "situations", label: "Facturation de situation" },
          ]}
          active={devisTab}
          onChange={setDevisTab}
        />
      )}

      {(devis.status !== "accepte" || devisTab === "lignes") && (
        <section>
          <div className="nova-section-header-row">
            <h2 className="nova-section-title">Lignes du devis</h2>
            <Button variant="secondary" onClick={openAddLine}>
              <Plus size={16} strokeWidth={1.75} />
              Ajouter une ligne
            </Button>
          </div>
          <Table
            columns={lineColumns}
            rows={devis.lines}
            emptyLabel="Aucune ligne pour le moment — ajoutez la première ligne du devis."
          />

          {devis.lines.length > 0 && (
            <div className="nova-devis-totals">
              <div className="nova-devis-totals-row">
                <span>Sous-total HT</span>
                <span>{totals.sousTotalHT.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €</span>
              </div>
              {remisePct > 0 && (
                <div className="nova-devis-totals-row">
                  <span>Remise ({remisePct}%)</span>
                  <span>− {totals.remiseMontant.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €</span>
                </div>
              )}
              <div className="nova-devis-totals-row">
                <span>Total HT</span>
                <span>{totals.totalHT.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €</span>
              </div>
              {tvaBuckets.map((b) => (
                <div className="nova-devis-totals-row" key={b.rate}>
                  <span>TVA {b.rate}%</span>
                  <span>{b.tva.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €</span>
                </div>
              ))}
              <div className="nova-devis-totals-row nova-devis-totals-ttc">
                <span>Total TTC</span>
                <span>{totals.totalTTC.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €</span>
              </div>
            </div>
          )}

          {mentionsLegales.length > 0 && (
            <div className="nova-tva-mentions">
              {mentionsLegales.map((mention) => (
                <p key={mention} className="nova-tva-mention">
                  {mention}
                </p>
              ))}
            </div>
          )}

          {devis.lines.some((l) => l.tva === 10) && attestationTva !== undefined && (
            <div className="nova-alert nova-alert-amber">
              <AlertTriangle size={18} strokeWidth={1.75} />
              <div>
                <p>
                  Ce devis applique un taux de TVA réduit à 10% — une attestation TVA signée par le client peut être
                  demandée par l&apos;administration fiscale en cas de contrôle.
                </p>
                <Link
                  href={
                    attestationTva
                      ? `/dashboard/attestations/${attestationTva.id}/imprimer`
                      : `/dashboard/attestations/nouveau?clientId=${devis.client?.id || ""}&devisId=${devis.id}`
                  }
                  className="nova-btn nova-btn-secondary"
                >
                  {attestationTva ? "Voir l'attestation" : "Créer l'attestation TVA"}
                </Link>
              </div>
            </div>
          )}
        </section>
      )}

      {devis.status === "accepte" && devisTab === "situations" && (
        <section>
          <div className="nova-section-header-row">
            <h2 className="nova-section-title">Facturation de situation</h2>
            <Button variant="secondary" onClick={openCreateSituation}>
              <Plus size={16} strokeWidth={1.75} />
              Créer une situation
            </Button>
          </div>

          {situations === null ? (
            <Skeleton style={{ height: 120 }} />
          ) : situations.length === 0 ? (
            <>
              <EmptyState
                icon="facturation"
                title="Aucune situation pour le moment"
                description="Facturez ce chantier par avancement plutôt qu'en une seule fois — créez une première situation."
              />
              <div className="nova-status-actions">
                <Button onClick={openCreateSituation}>
                  <Plus size={16} strokeWidth={1.75} />
                  Créer une situation
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="nova-situation-progress">
                <ProgressBar
                  value={
                    montantTotalDevisHT(devis) > 0
                      ? (situations.reduce((sum, s) => sum + s.montantHT, 0) / montantTotalDevisHT(devis)) * 100
                      : 0
                  }
                  label={`${situations
                    .reduce((sum, s) => sum + s.montantHT, 0)
                    .toLocaleString("fr-FR", { maximumFractionDigits: 2 })} € facturés sur ${montantTotalDevisHT(devis).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`}
                />
              </div>

              <div className="nova-situation-list">
                {situations.map((s) => (
                  <Card key={s.id} className="nova-situation-card">
                    <div className="nova-situation-card-header">
                      <div>
                        <span className="nova-cell-title">Situation n°{s.numero}</span>{" "}
                        <Badge tone={SITUATION_STATUT_TONE[s.statut]}>{SITUATION_STATUT_LABEL[s.statut]}</Badge>
                      </div>
                      <span className="nova-cell-amount">{s.montantHT.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €</span>
                    </div>
                    <p className="nova-page-subtitle">
                      {s.pourcentageAvancement}% d'avancement · <Timestamp date={s.createdAt} />
                    </p>
                    <div className="nova-status-actions">
                      {s.statut === "brouillon" && (
                        <Button
                          variant="secondary"
                          disabled={updatingSituationId === s.id}
                          onClick={() => updateSituationStatut(s, "envoyee")}
                        >
                          Marquer comme envoyée
                        </Button>
                      )}
                      {s.statut === "envoyee" && (
                        <Button
                          variant="success"
                          disabled={updatingSituationId === s.id}
                          onClick={() => updateSituationStatut(s, "payee")}
                        >
                          Marquer comme payée
                        </Button>
                      )}
                      <Link href={`/dashboard/situations/${s.id}/imprimer`} className="nova-btn nova-btn-secondary">
                        <FileText size={16} strokeWidth={1.75} />
                        Voir la facture
                      </Link>
                      {s.statut === "payee" && (
                        <a href={`/api/situations/${s.id}/facturx`} className="nova-btn nova-btn-secondary">
                          <Download size={16} strokeWidth={1.75} />
                          Factur-X
                        </a>
                      )}
                      <Button variant="danger" onClick={() => setDeleteSituationTarget(s)}>
                        <Trash2 size={16} strokeWidth={1.75} />
                        Supprimer
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {devis.status === "accepte" && (
        <section>
          <div className="nova-section-header-row">
            <h2 className="nova-section-title">Acomptes</h2>
            <Button variant="secondary" onClick={openAcompteModal}>
              <Plus size={16} strokeWidth={1.75} />
              Demander un acompte
            </Button>
          </div>

          {acomptes === null ? (
            <Skeleton style={{ height: 120 }} />
          ) : acomptes.length === 0 ? (
            <EmptyState
              icon="facturation"
              title="Aucun acompte pour le moment"
              description="Demandez un acompte à votre client avant de démarrer le chantier."
            />
          ) : (
            <>
              <div className="nova-situation-progress">
                <ProgressBar
                  value={
                    montantTotalDevisHT(devis) > 0
                      ? (acomptes.filter((a) => a.statut === "recu").reduce((sum, a) => sum + a.montantHT, 0) /
                          montantTotalDevisHT(devis)) *
                        100
                      : 0
                  }
                  label={`${acomptes
                    .filter((a) => a.statut === "recu")
                    .reduce((sum, a) => sum + a.montantHT, 0)
                    .toLocaleString("fr-FR", { maximumFractionDigits: 2 })} € d'acomptes reçus sur ${montantTotalDevisHT(devis).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`}
                />
              </div>

              <div className="nova-situation-list">
                {acomptes.map((a) => (
                  <Card key={a.id} className="nova-situation-card">
                    <div className="nova-situation-card-header">
                      <div>
                        <span className="nova-cell-title">Acompte {a.pourcentage}%</span>{" "}
                        <Badge tone={ACOMPTE_STATUT_TONE[a.statut]}>{ACOMPTE_STATUT_LABEL[a.statut]}</Badge>
                      </div>
                      <span className="nova-cell-amount">{a.montantHT.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} € HT</span>
                    </div>
                    <p className="nova-page-subtitle">
                      <Timestamp date={a.createdAt} />
                    </p>
                    {a.statut === "en_attente" && (
                      <div className="nova-status-actions">
                        <Button variant="success" disabled={updatingAcompteId === a.id} onClick={() => updateAcompteStatut(a, "recu")}>
                          Marquer comme reçu
                        </Button>
                        <Button variant="secondary" disabled={payingAcompteId === a.id} onClick={() => handlePayAcompte(a)}>
                          <Banknote size={16} strokeWidth={1.75} />
                          {payingAcompteId === a.id ? "Redirection..." : "Paiement Stripe"}
                        </Button>
                        <Button variant="danger" disabled={updatingAcompteId === a.id} onClick={() => updateAcompteStatut(a, "annule")}>
                          Annuler
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      <Card>
        <CardTitle>Remise et notes</CardTitle>
        <Field
          label="Remise (%)"
          type="number"
          min="0"
          max="100"
          step="0.5"
          value={remiseInput}
          onChange={(e) => setRemiseInput(e.target.value)}
        />
        <TextareaField
          label="Notes du devis"
          rows={3}
          value={notesInput}
          onChange={(e) => setNotesInput(e.target.value)}
          placeholder="Conditions, délais, remarques..."
          hint="Affiché sur le devis transmis au client."
        />
        <Button variant="secondary" disabled={savingSettings} onClick={handleSaveSettings}>
          {savingSettings ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </Card>

      {devis.content && (
        <Card>
          <CardTitle>Description générée (IA)</CardTitle>
          <div className="nova-ai-zone-header">
            <span className="nova-timestamp">
              Créé le <Timestamp date={devis.createdAt} />
            </span>
          </div>
          <p className="nova-card-text">{devis.content}</p>
        </Card>
      )}

      <ConfirmModal
        open={confirmingDelete}
        itemLabel={`le devis « ${devis.label} »`}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmingDelete(false)}
        confirming={deleting}
      />

      <EditModal
        open={lineForm !== null}
        title={editingLineId ? "Modifier la ligne" : "Ajouter une ligne"}
        onCancel={closeLineModal}
        onSave={confirmLineSave}
        saving={savingLine}
      >
        {lineForm && (
          <>
            {!editingLineId && (
              <Button type="button" variant="secondary" onClick={() => setOuvragePickerOpen(true)}>
                <BookOpen size={15} strokeWidth={1.75} />
                Choisir depuis la bibliothèque
              </Button>
            )}
            <SelectField
              label="Type"
              value={lineForm.type}
              onChange={(e) => setLineForm({ ...lineForm, type: e.target.value as DevisLineType })}
            >
              {(Object.keys(LINE_TYPE_LABEL) as DevisLineType[]).map((t) => (
                <option key={t} value={t}>
                  {LINE_TYPE_LABEL[t]}
                </option>
              ))}
            </SelectField>
            <Field
              label="Description"
              required
              value={lineForm.description}
              onChange={(e) => setLineForm({ ...lineForm, description: e.target.value })}
              placeholder="Pose de carrelage salle de bain"
            />
            <Field
              label="Quantité"
              type="number"
              min="0"
              step="0.01"
              value={lineForm.quantite}
              onChange={(e) => setLineForm({ ...lineForm, quantite: e.target.value })}
            />
            <Field
              label="Unité"
              value={lineForm.unite}
              onChange={(e) => setLineForm({ ...lineForm, unite: e.target.value })}
              placeholder="h, m², forfait..."
            />
            <Field
              label="Prix unitaire HT (€)"
              type="number"
              min="0"
              step="0.01"
              value={lineForm.prixUnitaire}
              onChange={(e) => setLineForm({ ...lineForm, prixUnitaire: e.target.value })}
            />
            <SelectField label="TVA" value={lineForm.tva} onChange={(e) => setLineForm({ ...lineForm, tva: e.target.value })}>
              <option value="20">20% — Taux normal (travaux neufs, pro)</option>
              <option value="10">10% — Taux réduit (rénovation logement &gt; 2 ans)</option>
              <option value="5.5">5.5% — Taux super-réduit (amélioration énergétique)</option>
            </SelectField>
          </>
        )}
      </EditModal>

      <ConfirmModal
        open={deleteLineTarget !== null}
        itemLabel={deleteLineTarget ? `la ligne « ${deleteLineTarget.description} »` : ""}
        onConfirm={confirmDeleteLine}
        onCancel={() => setDeleteLineTarget(null)}
        confirming={deletingLine}
      />

      {ouvragePickerOpen && (
        <div className="nova-modal-overlay" onClick={() => setOuvragePickerOpen(false)}>
          <div
            className="nova-modal nova-modal-edit"
            role="dialog"
            aria-modal="true"
            aria-label="Choisir depuis la bibliothèque"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="nova-modal-title">Choisir depuis la bibliothèque</h3>
            <SearchInput value={ouvrageQuery} onChange={setOuvrageQuery} placeholder="Rechercher un ouvrage..." />
            {ouvrageOptions === null ? (
              <Skeleton style={{ height: 160 }} />
            ) : (
              <div className="nova-picker-list">
                {ouvrageOptions
                  .filter((o) => o.label.toLowerCase().includes(ouvrageQuery.trim().toLowerCase()))
                  .map((o) => (
                    <button key={o.id} type="button" className="nova-picker-row" onClick={() => selectOuvrage(o)}>
                      <span className="nova-picker-row-label">
                        {o.label} <Badge tone="neutral">{OUVRAGE_TYPE_LABEL[o.type as keyof typeof OUVRAGE_TYPE_LABEL] || o.type}</Badge>
                      </span>
                      <span className="nova-picker-row-price">
                        {o.prixUnitaireHT.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} € / {o.unite}
                      </span>
                    </button>
                  ))}
                {ouvrageOptions.length === 0 && <p className="nova-page-subtitle">Bibliothèque vide.</p>}
              </div>
            )}
            <div className="nova-modal-actions">
              <Button type="button" variant="ghost" onClick={() => setOuvragePickerOpen(false)}>
                Fermer
              </Button>
            </div>
          </div>
        </div>
      )}

      <EditModal
        open={situationForm !== null}
        title="Créer une situation"
        onCancel={() => setSituationForm(null)}
        onSave={confirmSituationSave}
        saving={savingSituation}
      >
        {situationForm && (
          <>
            <Field label="Numéro" value={`Situation n°${(situations?.length ?? 0) + 1}`} readOnly disabled />
            <div className="nova-field">
              <label>Avancement ({situationForm.pourcentageAvancement}%)</label>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={situationForm.pourcentageAvancement}
                onChange={(e) => handleSituationPctChange(e.target.value)}
                className="nova-slider"
              />
            </div>
            <Field
              label="Montant HT (€)"
              type="number"
              min="0"
              step="0.01"
              value={situationForm.montantHT}
              onChange={(e) => setSituationForm({ ...situationForm, montantHT: e.target.value })}
              hint="Calculé automatiquement depuis le % d'avancement — modifiable manuellement."
            />
          </>
        )}
      </EditModal>

      <ConfirmModal
        open={deleteSituationTarget !== null}
        itemLabel={deleteSituationTarget ? `la situation n°${deleteSituationTarget.numero}` : ""}
        onConfirm={confirmDeleteSituation}
        onCancel={() => setDeleteSituationTarget(null)}
        confirming={deletingSituation}
      />

      <EditModal
        open={acompteModalOpen}
        title="Demander un acompte"
        onCancel={() => setAcompteModalOpen(false)}
        onSave={confirmCreateAcompte}
        saving={creatingAcompte}
      >
        <div className="nova-field">
          <label>Pourcentage ({acomptePourcentage}%)</label>
          <input
            type="range"
            min="10"
            max="90"
            step="5"
            value={acomptePourcentage}
            onChange={(e) => setAcomptePourcentage(Number(e.target.value))}
            className="nova-slider"
          />
        </div>
        <Field
          label="Montant HT (€)"
          value={`${((acomptePourcentage / 100) * montantTotalDevisHT(devis)).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`}
          readOnly
          disabled
          hint="Calculé automatiquement à partir du montant total HT du devis."
        />
      </EditModal>
    </div>
  );
}
