"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Email ou mot de passe incorrect.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="card">
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>Connexion</h1>
      <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 20 }}>
        Accédez à votre espace Nova.
      </p>
      <form onSubmit={handleSubmit}>
        <label>Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>Mot de passe</label>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <div className="error">{error}</div>}
        <button className="primary" type="submit" disabled={loading} style={{ width: "100%", marginTop: 8 }}>
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>
      <p style={{ fontSize: 13, marginTop: 18, color: "var(--ink-soft)" }}>
        Pas encore de compte ? <Link href="/register" style={{ color: "var(--teal-deep)", fontWeight: 600 }}>Créer un compte</Link>
      </p>
    </div>
  );
}
