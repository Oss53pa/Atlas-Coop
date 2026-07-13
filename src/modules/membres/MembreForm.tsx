import { useState } from 'react';
import { useCoopQuery, useCoopMutation, supabase } from '../../hooks/data';
import { Modal, Button, Field, Input, Select, useToast, Badge } from '../../ui';
import { CATEGORIE_MEMBRE } from '../../domain/labels';
import { cn } from '../../lib/cn';
import type { CategorieMembre, CoopSection, MembreStatut } from '../../domain/database.types';

export function MembreForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { push } = useToast();
  const [nom, setNom] = useState('');
  const [prenoms, setPrenoms] = useState('');
  const [sexe, setSexe] = useState('M');
  const [telephone, setTelephone] = useState('');
  const [village, setVillage] = useState('');
  const [statut, setStatut] = useState<MembreStatut>('actif');
  const [cats, setCats] = useState<CategorieMembre[]>(['usager_producteur']);
  const [sectionIds, setSectionIds] = useState<string[]>([]);

  const { data: sections } = useCoopQuery(['sections'], async (coopId) => {
    const { data } = await supabase.from('coop_sections').select('*').eq('cooperative_id', coopId).eq('actif', true).order('ordre');
    return (data ?? []) as CoopSection[];
  });

  const reset = () => {
    setNom(''); setPrenoms(''); setTelephone(''); setVillage('');
    setCats(['usager_producteur']); setSectionIds([]); setStatut('actif');
  };

  const create = useCoopMutation(
    async (coopId) => {
      const { data: membre, error } = await supabase
        .from('coop_membres')
        .insert({
          cooperative_id: coopId,
          nom, prenoms: prenoms || null, sexe, telephone: telephone || null,
          village: village || null, statut, date_entree: new Date().toISOString().slice(0, 10),
        })
        .select('id')
        .single();
      if (error) throw error;
      const mid = membre.id;
      await Promise.all([
        cats.length &&
          supabase.from('coop_membres_categories').insert(
            cats.map((c) => ({ cooperative_id: coopId, membre_id: mid, categorie: c })),
          ),
        sectionIds.length &&
          supabase.from('coop_membres_sections').insert(
            sectionIds.map((s) => ({ cooperative_id: coopId, membre_id: mid, section_id: s })),
          ),
        supabase.from('coop_membres_statut_historique').insert({
          cooperative_id: coopId, membre_id: mid, statut, motif: 'Adhésion',
        }),
      ]);
    },
    {
      invalidate: ['membres', 'dashboard'],
      onSuccess: () => { push('success', 'Membre enregistré'); reset(); onClose(); },
    },
  );

  const toggleCat = (c: CategorieMembre) =>
    setCats((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  const toggleSection = (s: string) =>
    setSectionIds((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Nouveau membre"
      subtitle="Le matricule est généré automatiquement (M-000001)."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button variant="action" onClick={() => create.mutate(undefined)} loading={create.isPending} disabled={!nom}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nom" required>
            <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Traoré" />
          </Field>
          <Field label="Prénoms">
            <Input value={prenoms} onChange={(e) => setPrenoms(e.target.value)} placeholder="Awa" />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Sexe">
            <Select value={sexe} onChange={(e) => setSexe(e.target.value)}>
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
            </Select>
          </Field>
          <Field label="Téléphone" hint="Pour les SMS">
            <Input value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="+225 07…" />
          </Field>
          <Field label="Village / localité">
            <Input value={village} onChange={(e) => setVillage(e.target.value)} />
          </Field>
        </div>

        <Field label="Catégories" hint="Cumulables — déterminent les droits économiques (P8)">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CATEGORIE_MEMBRE) as CategorieMembre[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleCat(c)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm transition-colors',
                  cats.includes(c)
                    ? 'border-primaire bg-primaire/10 text-primaire'
                    : 'border-ligne text-texte-2 hover:bg-surface-2',
                )}
              >
                {CATEGORIE_MEMBRE[c]}
              </button>
            ))}
          </div>
        </Field>

        {sections && sections.length > 0 && (
          <Field label="Sections d'adhésion">
            <div className="flex flex-wrap gap-2">
              {sections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSection(s.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                    sectionIds.includes(s.id)
                      ? 'border-action bg-action/10 text-action'
                      : 'border-ligne text-texte-2 hover:bg-surface-2',
                  )}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: s.couleur ?? 'var(--primaire)' }} />
                  {s.nom}
                </button>
              ))}
            </div>
          </Field>
        )}

        <Field label="Statut initial">
          <Select value={statut} onChange={(e) => setStatut(e.target.value as MembreStatut)}>
            <option value="actif">Actif</option>
            <option value="candidat">Candidat</option>
            <option value="probatoire">Probatoire</option>
          </Select>
        </Field>

        <div className="rounded-lg bg-surface-2 p-3 text-xs text-texte-2">
          <Badge tone="info">P2</Badge>{' '}
          Membre fondateur et membre entrant sont le même objet : aucun privilège codé en dur.
        </div>
      </div>
    </Modal>
  );
}
