"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Impossible de créer le compte.");
      setLoading(false);
      return;
    }

    // Connexion automatique après inscription.
    const signInRes = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (signInRes?.error) {
      router.push("/login");
      return;
    }
    router.push("/onboarding");
  }

  return (
    <div className="card">
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Créer un compte</h1>
      <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 20 }}>
        8 caractères minimum pour le mot de passe.
      </p>
      <form onSubmit={handleSubmit}>
        <label>Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>Mot de passe</label>
        <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <div className="error">{error}</div>}
        <button className="primary" type="submit" disabled={loading} style={{ width: "100%", marginTop: 8 }}>
          {loading ? "Création..." : "Créer mon compte"}
        </button>
      </form>
      <p style={{ fontSize: 13, marginTop: 18, color: "var(--ink-soft)" }}>
        Déjà un compte ? <Link href="/login" style={{ color: "var(--teal-deep)", fontWeight: 600 }}>Se connecter</Link>
      </p>
    </div>
  );
}
