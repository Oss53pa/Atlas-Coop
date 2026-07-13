import { useState } from 'react';
import { Coins, Plus, Percent } from 'lucide-react';
import { useCoopQuery, useCoopMutation, supabase } from '../../hooks/data';
import { useCoop } from '../../auth/CooperativeProvider';
import {
  PageHeader, Button, Card, CardHeader, CardBody, Stat, Money, Modal, Field, Input, Select,
  Spinner, EmptyState, useToast, Table, THead, TBody, Th, Tr, Td, Badge,
} from '../../ui';
import { MembrePicker } from '../../components/MembrePicker';
import { formatDate } from '../../lib/format';
import { formatNumber } from '../../lib/format';

interface Picked { id: string; numero: string; nom: string; prenoms: string | null; telephone: string | null; photo_url: string | null }

export function CapitalPage() {
  const { current } = useCoop();
  const { push } = useToast();
  const [open, setOpen] = useState(false);

  const { data, isLoading, refetch } = useCoopQuery(['capital'], async (coopId) => {
    const [libs, sous] = await Promise.all([
      supabase.from('coop_parts_liberations').select('*, coop_membres(nom, prenoms, numero)').eq('cooperative_id', coopId).order('date_liberation', { ascending: false }).limit(50),
      supabase.from('coop_parts_souscriptions').select('nombre').eq('cooperative_id', coopId),
    ]);
    const liberations = libs.data ?? [];
    const partsLib = liberations.reduce((s, l) => s + (l.nombre as number), 0);
    const capitalLib = liberations.reduce((s, l) => s + (l.montant_xof as number), 0);
    const partsSous = (sous.data ?? []).reduce((s, l) => s + (l.nombre as number), 0);
    return { liberations, partsLib, capitalLib, partsSous };
  });

  return (
    <>
      <PageHeader
        title="Capital & parts sociales"
        subtitle="La ristourne rémunère l'usage, l'intérêt rémunère le capital (P8)."
        icon={<Coins className="h-5 w-5" />}
        actions={<Button variant="action" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Souscrire / libérer</Button>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Parts souscrites" value={formatNumber(data?.partsSous ?? 0)} icon={<Coins className="h-4 w-4" />} />
        <Stat label="Parts libérées" value={formatNumber(data?.partsLib ?? 0)} tone="action" icon={<Coins className="h-4 w-4" />} />
        <Stat label="Capital libéré" value={<Money value={data?.capitalLib ?? 0} suffix={false} size="xl" />} tone="or" icon={<Coins className="h-4 w-4" />} />
        <Stat label="Valeur nominale" value={<Money value={current?.valeur_part_xof ?? 0} suffix={false} size="lg" />} hint="par part" tone="primaire" />
      </div>

      <div className="mb-4 flex items-start gap-2 rounded-xl border border-primaire/20 bg-primaire/5 p-3 text-sm text-texte-2">
        <Percent className="mt-0.5 h-4 w-4 shrink-0 text-primaire" />
        <span>
          <b className="text-texte">Ordre d'affectation du résultat</b> (statuts) : réserves légales OHADA → intérêt aux parts
          (tous détenteurs, y compris apporteurs de capitaux) → ristournes d'activité (usagers) → report.
        </span>
      </div>

      <Card>
        <CardHeader title="Libérations récentes" />
        <CardBody className="p-0">
          {isLoading ? <Spinner /> : !data?.liberations.length ? (
            <EmptyState icon={<Coins className="h-8 w-8" />} title="Aucune libération" description="Enregistrez les souscriptions et libérations de parts des membres." action={<Button variant="action" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Enregistrer</Button>} />
          ) : (
            <Table>
              <THead><Th>Date</Th><Th>Membre</Th><Th>Mode</Th><Th align="center">Parts</Th><Th align="right">Montant</Th></THead>
              <TBody>
                {data.liberations.map((l: Record<string, unknown>) => {
                  const m = l.coop_membres as { nom?: string; prenoms?: string; numero?: string } | null;
                  return (
                    <Tr key={l.id as string}>
                      <Td className="text-xs text-texte-2">{formatDate(l.date_liberation as string)}</Td>
                      <Td><span className="font-medium text-texte">{m?.nom} {m?.prenoms}</span> <span className="mono text-xs text-texte-2">{m?.numero}</span></Td>
                      <Td><Badge tone="neutre">{(l.mode as string).replace('_', ' ')}</Badge></Td>
                      <Td align="center">{l.nombre as number}</Td>
                      <Td align="right"><Money value={l.montant_xof as number} size="sm" /></Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {open && <SouscriptionForm valeurPart={current?.valeur_part_xof ?? 10000} onClose={() => { setOpen(false); refetch(); }} onDone={() => push('success', 'Parts enregistrées')} />}
    </>
  );
}

function SouscriptionForm({ valeurPart, onClose, onDone }: { valeurPart: number; onClose: () => void; onDone: () => void }) {
  const [membre, setMembre] = useState<Picked | null>(null);
  const [nombre, setNombre] = useState('1');
  const [mode, setMode] = useState('numeraire');
  const [libererMaintenant, setLibererMaintenant] = useState(true);
  const n = Number(nombre) || 0;
  const montant = n * valeurPart;

  const save = useCoopMutation(
    async (coopId) => {
      if (!membre) throw new Error('Membre requis');
      const { data: sous, error } = await supabase.from('coop_parts_souscriptions').insert({
        cooperative_id: coopId, membre_id: membre.id, nombre: n, valeur_nominale_xof: valeurPart,
      }).select('id').single();
      if (error) throw error;
      if (libererMaintenant) {
        const { error: e2 } = await supabase.from('coop_parts_liberations').insert({
          cooperative_id: coopId, membre_id: membre.id, souscription_id: sous.id,
          nombre: n, montant_xof: montant, mode,
        });
        if (e2) throw e2;
      }
    },
    { invalidate: ['capital', 'membre', 'dashboard'], onSuccess: () => { onDone(); onClose(); } },
  );

  return (
    <Modal open onClose={onClose} title="Souscription de parts" subtitle="Capital social du membre"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={save.isPending} disabled={!membre || n <= 0} onClick={() => save.mutate(undefined)}>Enregistrer</Button></>}>
      <div className="space-y-4">
        {membre ? (
          <div className="flex items-center justify-between rounded-lg border border-action/30 bg-action/5 p-3">
            <span className="font-medium text-texte">{membre.nom} {membre.prenoms} <span className="mono text-xs text-texte-2">{membre.numero}</span></span>
            <Button variant="ghost" size="sm" onClick={() => setMembre(null)}>Changer</Button>
          </div>
        ) : <MembrePicker value={null} onChange={setMembre} onlyActive={false} />}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre de parts" required><Input type="number" min={1} value={nombre} onChange={(e) => setNombre(e.target.value)} /></Field>
          <Field label="Mode de libération"><Select value={mode} onChange={(e) => setMode(e.target.value)}><option value="numeraire">Numéraire</option><option value="mobile_money">Mobile Money</option><option value="nature">En nature</option></Select></Field>
        </div>
        <label className="flex items-center gap-2 text-sm text-texte">
          <input type="checkbox" checked={libererMaintenant} onChange={(e) => setLibererMaintenant(e.target.checked)} className="h-4 w-4 rounded border-ligne text-action" />
          Libérer immédiatement
        </label>
        <div className="rounded-lg bg-surface-2 p-3 text-sm">
          <div className="flex justify-between"><span className="text-texte-2">Montant total</span><Money value={montant} size="sm" /></div>
        </div>
      </div>
    </Modal>
  );
}
