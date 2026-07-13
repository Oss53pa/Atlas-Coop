import { useState } from 'react';
import { Building2, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCoop } from '../auth/CooperativeProvider';
import { useAuth } from '../auth/AuthProvider';
import { Button, Field, Input, Select, useToast } from '../ui';

export function Onboarding() {
  const { refresh } = useCoop();
  const { signOut } = useAuth();
  const { push } = useToast();
  const [nom, setNom] = useState('');
  const [sigle, setSigle] = useState('');
  const [forme, setForme] = useState<'SCOOPS' | 'COOP_CA'>('SCOOPS');
  const [pays, setPays] = useState('CI');
  const [ville, setVille] = useState('');
  const [valeurPart, setValeurPart] = useState('10000');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('coop_cooperatives').insert({
        nom,
        sigle: sigle || null,
        forme_juridique: forme,
        pays,
        ville: ville || null,
        valeur_part_xof: Number(valeurPart) || 10000,
      });
      if (error) throw error;
      push('success', 'Coopérative créée. Bienvenue sur Atlas Coop.');
      await refresh();
    } catch (err) {
      push('error', (err as Error).message ?? 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-fond p-4">
      <div className="w-full max-w-lg rounded-3xl border border-ligne bg-surface p-8 shadow-carte-hover">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primaire/10 text-primaire">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-texte">Créer votre coopérative</h1>
            <p className="text-sm text-texte-2">Première étape avant tout enregistrement.</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Dénomination" required>
            <Input value={nom} onChange={(e) => setNom(e.target.value)} required placeholder="Coopérative agricole de..." />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Sigle">
              <Input value={sigle} onChange={(e) => setSigle(e.target.value)} placeholder="CAxxx" />
            </Field>
            <Field label="Forme juridique" hint="Détermine organes & votes">
              <Select value={forme} onChange={(e) => setForme(e.target.value as 'SCOOPS' | 'COOP_CA')}>
                <option value="SCOOPS">SCOOPS (comité de gestion)</option>
                <option value="COOP_CA">COOP-CA (conseil d'administration)</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Pays">
              <Select value={pays} onChange={(e) => setPays(e.target.value)}>
                <option value="CI">Côte d'Ivoire</option>
                <option value="SN">Sénégal</option>
                <option value="BF">Burkina Faso</option>
                <option value="ML">Mali</option>
                <option value="BJ">Bénin</option>
                <option value="TG">Togo</option>
                <option value="CM">Cameroun</option>
                <option value="NE">Niger</option>
              </Select>
            </Field>
            <Field label="Ville / siège">
              <Input value={ville} onChange={(e) => setVille(e.target.value)} placeholder="Bouaké" />
            </Field>
          </div>
          <Field label="Valeur nominale de la part (FCFA)" hint="Modifiable ensuite dans les statuts">
            <Input type="number" value={valeurPart} onChange={(e) => setValeurPart(e.target.value)} min={0} />
          </Field>

          <Button type="submit" variant="action" size="lg" loading={loading} className="w-full justify-center">
            <Sparkles className="h-4 w-4" />
            Créer et démarrer
          </Button>
        </form>

        <button onClick={signOut} className="mt-4 text-sm text-texte-2 hover:text-texte">
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
