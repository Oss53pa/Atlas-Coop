import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Waves, LogIn, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button, Field, Input, useToast } from '../ui';

export function LoginPage() {
  const { push } = useToast();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        push('success', 'Compte créé. Vous pouvez vous connecter.');
        setMode('signin');
      }
    } catch (err) {
      push('error', (err as Error).message ?? 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-fond p-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-ligne bg-surface shadow-carte-hover md:grid-cols-2">
        {/* Panneau marque — bleu fleuve */}
        <div className="relative hidden flex-col justify-between bg-primaire p-8 text-white md:flex">
          <div>
            <div className="font-display text-4xl">Atlas Coop</div>
            <p className="mt-1 text-sm text-white/70">
              Gestion de coopérative agropastorale · OHADA
            </p>
          </div>
          <div className="space-y-4">
            <Feature icon={<Waves className="h-5 w-5" />} title="Le membre au centre">
              Grand livre individuel. Chaque franc, chaque kilo traçable.
            </Feature>
            <Feature icon={<Leaf className="h-5 w-5" />} title="Multi-sections">
              Pêche, élevage, agriculture, transformation, services.
            </Feature>
          </div>
          <p className="text-xs text-white/50">Suite Atlas Studio · UEMOA / CEMAC</p>
        </div>

        {/* Formulaire */}
        <div className="p-8">
          <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm text-texte-2 hover:text-texte">
            <ArrowLeft className="h-4 w-4" /> Accueil
          </Link>
          <h1 className="text-xl font-bold text-texte">
            {mode === 'signin' ? 'Connexion' : 'Créer un compte'}
          </h1>
          <p className="mt-1 text-sm text-texte-2">
            {mode === 'signin'
              ? 'Accédez à votre coopérative.'
              : 'Configurez votre première coopérative après inscription.'}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === 'signup' && (
              <Field label="Nom complet">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Awa Traoré" />
              </Field>
            )}
            <Field label="Email" required>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                autoComplete="email"
              />
            </Field>
            <Field label="Mot de passe" required>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </Field>
            <Button type="submit" variant="action" size="lg" loading={loading} className="w-full justify-center">
              <LogIn className="h-4 w-4" />
              {mode === 'signin' ? 'Se connecter' : 'Créer le compte'}
            </Button>
          </form>

          <button
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="mt-4 text-sm text-primaire hover:underline"
          >
            {mode === 'signin' ? 'Pas encore de compte ? Créer' : 'Déjà un compte ? Se connecter'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">{icon}</div>
      <div>
        <div className="font-semibold">{title}</div>
        <p className="text-sm text-white/70">{children}</p>
      </div>
    </div>
  );
}
