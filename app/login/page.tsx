// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(false);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (response.ok) {
        router.push("/today");
        router.refresh();
      } else setError(true);
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <div className="mb-8">
          <p className="text-3xl font-semibold tracking-tight">macy.</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Ton carnet quotidien, à ton rythme.
          </p>
        </div>
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoFocus
        />
        {error && (
          <p className="text-sm text-muted-foreground">
            Connexion impossible. Vérifie ton mot de passe et réessaie.
          </p>
        )}
        <Button type="submit" disabled={submitting} className="w-full">
          Entrer
        </Button>
      </form>
    </main>
  );
}
