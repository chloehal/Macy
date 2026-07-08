// app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(false);

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });

    if (response.ok) {
      router.push('/today');
      router.refresh();
    } else {
      setError(true);
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoFocus
        />
        {error && <p className="text-sm text-muted-foreground">Mot de passe incorrect.</p>}
        <Button type="submit" disabled={submitting} className="w-full">
          Entrer
        </Button>
      </form>
    </main>
  );
}
