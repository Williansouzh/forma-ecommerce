"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { login } from "@/lib/admin-api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-body-small text-secondary transition-colors hover:text-accent"
        >
          <ArrowLeft size={15} />
          Voltar à loja
        </Link>

        <h1 className="mt-6 font-display text-heading-2 tracking-tight">
          Painel <span className="text-accent">FORMA.</span>
        </h1>
        <p className="mt-2 text-body-small text-secondary">
          Acesso restrito à equipe do estúdio.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="text-caption uppercase text-tertiary">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 w-full rounded-md border border-strong bg-surface px-4 py-3 text-body outline-none transition-colors focus:border-accent"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-caption uppercase text-tertiary">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1.5 w-full rounded-md border border-strong bg-surface px-4 py-3 text-body outline-none transition-colors focus:border-accent"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-error/10 px-4 py-3 text-body-small text-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-accent px-6 py-3.5 text-body font-medium text-white transition-all hover:bg-accent-dark active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
