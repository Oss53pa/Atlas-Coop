import { useState } from 'react';
import { Blocks, Plus } from 'lucide-react';
import { useCoopQuery, useCoopMutation, supabase } from '../../hooks/data';
import {
  PageHeader, Button, Card, CardBody, Badge, Modal, Field, Input, Select, Spinner, EmptyState, useToast,
} from '../../ui';
import { MODE_PRODUCTION } from '../../domain/labels';
import { unitOptions } from '../../lib/units';
import type { ModeProduction, UniteBase, CoopSection } from '../../domain/database.types';

const COULEURS = ['#16324F', '#3E8250', '#C9880F', '#9C3F1C', '#6E93B8', '#7FAE8B'];

export function SectionsPage() {
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const { data: sections, isLoading } = useCoopQuery(['sections'], async (coopId) => {
    const { data } = await supabase
      .from('coop_sections')
      .select('*')
      .eq('cooperative_id', coopId)
      .order('ordre');
    return (data ?? []) as CoopSection[];
  });

  const create = useCoopMutation(
    async (coopId, form: Record<string, unknown>) => {
      const { error } = await supabase.from('coop_sections').insert({ ...form, cooperative_id: coopId });
      if (error) throw error;
    },
    { invalidate: ['sections'], onSuccess: () => { push('success', 'Section créée'); setOpen(false); } },
  );

  return (
    <>
      <PageHeader
        title="Sections d'activité"
        subtitle="Framework A1 — toute activité s'ajoute par déclaration, sans développement du noyau."
        icon={<Blocks className="h-5 w-5" />}
        actions={
          <Button variant="action" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Nouvelle section
          </Button>
        }
      />

      {isLoading ? (
        <Spinner />
      ) : !sections?.length ? (
        <EmptyState
          icon={<Blocks className="h-8 w-8" />}
          title="Aucune section"
          description="Déclarez vos sections (pêche, agriculture, élevage…). Chacune définit ses unités et son mode de production."
          action={<Button variant="action" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Créer</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((s) => (
            <Card key={s.id}>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full" style={{ background: s.couleur ?? 'var(--primaire)' }} />
                    <h3 className="font-semibold text-texte">{s.nom}</h3>
                  </div>
                  <Badge tone={s.actif ? 'action' : 'neutre'}>{s.code}</Badge>
                </div>
                <div className="mt-3 space-y-1 text-sm text-texte-2">
                  <div>{MODE_PRODUCTION[s.mode_production]}</div>
                  <div>Unité : <span className="mono">{s.unite_base}</span> · affichage <span className="font-medium text-texte">{s.unite_affichage}</span></div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <SectionForm open={open} onClose={() => setOpen(false)} onSubmit={(f) => create.mutate(f)} loading={create.isPending} />
    </>
  );
}

function SectionForm({
  open, onClose, onSubmit, loading,
}: {
  open: boolean; onClose: () => void; onSubmit: (f: Record<string, unknown>) => void; loading: boolean;
}) {
  const [code, setCode] = useState('');
  const [nom, setNom] = useState('');
  const [mode, setMode] = useState<ModeProduction>('apport_ponctuel');
  const [uniteBase, setUniteBase] = useState<UniteBase>('g');
  const [uniteAff, setUniteAff] = useState('kg');
  const [couleur, setCouleur] = useState(COULEURS[1]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ code: code.toUpperCase(), nom, mode_production: mode, unite_base: uniteBase, unite_affichage: uniteAff, couleur });
  };

  return (
    <Modal open={open} onClose={onClose} title="Nouvelle section" subtitle="Déclaration de référentiels (framework A1)"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button variant="action" onClick={submit} loading={loading}>Créer la section</Button>
        </>
      }>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Code" required className="col-span-1">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="PECHE" required />
          </Field>
          <Field label="Nom" required className="col-span-2">
            <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Pêche de capture" required />
          </Field>
        </div>
        <Field label="Mode de production">
          <Select value={mode} onChange={(e) => setMode(e.target.value as ModeProduction)}>
            {Object.entries(MODE_PRODUCTION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unité de base" hint="Précision de stockage">
            <Select value={uniteBase} onChange={(e) => setUniteBase(e.target.value as UniteBase)}>
              <option value="g">grammes (g)</option>
              <option value="ml">millilitres (ml)</option>
              <option value="u">unités (u)</option>
              <option value="m2">mètres carrés (m²)</option>
            </Select>
          </Field>
          <Field label="Unité d'affichage" hint="Ce que voit l'utilisateur">
            <Select value={uniteAff} onChange={(e) => setUniteAff(e.target.value)}>
              {unitOptions.filter((u) => u.base === uniteBase).map((u) => (
                <option key={u.key} value={u.key}>{u.label}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Couleur">
          <div className="flex gap-2">
            {COULEURS.map((c) => (
              <button key={c} type="button" onClick={() => setCouleur(c)}
                className={`h-8 w-8 rounded-full transition ${couleur === c ? 'ring-2 ring-offset-2 ring-primaire' : ''}`}
                style={{ background: c }} />
            ))}
          </div>
        </Field>
      </form>
    </Modal>
  );
}
