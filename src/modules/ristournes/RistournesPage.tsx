import { useState } from 'react';
import { PieChart, Plus, Coins, Send, CheckCircle2, Eye, Sparkles } from 'lucide-react';
import { useCoopQuery, useCoopMutation, supabase } from '../../hooks/data';
import {
  PageHeader, Button, Card, Badge, Money, Modal, Field, Input, Select,
  Spinner, EmptyState, useToast, Table, THead, TBody, Th, Tr, Td,
} from '../../ui';
import { formatFcfaText } from '../../lib/money';
import { formatDate, formatNumber } from '../../lib/format';
import { formatQty } from '../../lib/units';
import { splitProrata } from '../../lib/repartition';
import type { CoopCampagne } from '../../domain/database.types';

interface Calcul {
  id: string; campagne_id: string | null; methode: string; base_repartissable_xof: number;
  total_base: number; nb_membres: number; statut: string; libelle: string | null; created_at: string;
  coop_campagnes: { nom: string } | null;
}

/** Répartit `base` au prorata des `base_i` via la lib testée `splitProrata`. */
function computeShares(base: number, entries: { membre_id: string; base_i: number }[]) {
  const parts = splitProrata(base, entries.map((e) => ({ id: e.membre_id, poids: e.base_i })));
  const montantById = new Map(parts.map((p) => [p.id, p.montant]));
  return entries.map((e) => ({ membre_id: e.membre_id, base_i: e.base_i, montant: montantById.get(e.membre_id) ?? 0 }));
}

export function RistournesPage() {
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);

  const { data: campagnes } = useCoopQuery(['campagnes'], async (coopId) => {
    const { data } = await supabase.from('coop_campagnes').select('*, coop_sections(nom)').eq('cooperative_id', coopId).order('date_debut', { ascending: false });
    return (data ?? []) as (CoopCampagne & { coop_sections: { nom: string } | null })[];
  });

  const { data: calculs, isLoading, refetch } = useCoopQuery(['ristournes'], async (coopId) => {
    const { data } = await supabase.from('coop_calculs_ristournes').select('*, coop_campagnes(nom)').eq('cooperative_id', coopId).order('created_at', { ascending: false });
    return (data ?? []) as Calcul[];
  });

  return (
    <>
      <PageHeader
        title="Ristournes"
        subtitle="La ristourne rémunère l'usage, au prorata de l'activité — vérifiable par chaque membre (P5, P8)."
        icon={<PieChart className="h-5 w-5" />}
        actions={<Button variant="action" onClick={() => setOpen(true)} disabled={!campagnes?.length}><Plus className="h-4 w-4" /> Nouveau calcul</Button>}
      />

      <div className="mb-4 flex items-start gap-2 rounded-xl border border-primaire/20 bg-primaire/5 p-3 text-sm text-texte-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primaire" />
        Ordre d'affectation (statuts) : réserves légales OHADA → intérêt aux parts → <b className="text-texte">ristournes d'activité</b> → report. Seuls les membres usagers y ont droit.
      </div>

      {isLoading ? <Spinner /> : !calculs?.length ? (
        <EmptyState icon={<PieChart className="h-8 w-8" />} title="Aucun calcul" description="Simulez une ristourne à partir des apports d'une campagne." action={<Button variant="action" onClick={() => setOpen(true)} disabled={!campagnes?.length}><Plus className="h-4 w-4" /> Nouveau calcul</Button>} />
      ) : (
        <Card><Table>
          <THead><Th>Campagne</Th><Th>Méthode</Th><Th align="right">Base répartie</Th><Th align="center">Membres</Th><Th>Statut</Th><Th></Th></THead>
          <TBody>
            {calculs.map((c) => (
              <Tr key={c.id}>
                <Td className="font-medium text-texte">{c.coop_campagnes?.nom ?? c.libelle ?? '—'}<div className="text-xs font-normal text-texte-2">{formatDate(c.created_at)}</div></Td>
                <Td><Badge tone="neutre">{c.methode === 'prorata_volume' ? 'Prorata volume' : 'Prorata valeur'}</Badge></Td>
                <Td align="right"><Money value={c.base_repartissable_xof} size="sm" /></Td>
                <Td align="center">{c.nb_membres}</Td>
                <Td><Badge tone={c.statut === 'verse' ? 'action' : c.statut === 'valide' ? 'or' : 'neutre'} dot>{c.statut}</Badge></Td>
                <Td align="right"><Button variant="outline" size="sm" onClick={() => setDetail(c.id)}><Eye className="h-4 w-4" /> Détail</Button></Td>
              </Tr>
            ))}
          </TBody>
        </Table></Card>
      )}

      {open && <CalculForm campagnes={campagnes ?? []} onClose={() => { setOpen(false); refetch(); }} onDone={() => push('success', 'Simulation créée')} />}
      {detail && <DetailModal calculId={detail} onClose={() => { setDetail(null); refetch(); }} />}
    </>
  );
}

function CalculForm({ campagnes, onClose, onDone }: { campagnes: (CoopCampagne & { coop_sections: { nom: string } | null })[]; onClose: () => void; onDone: () => void }) {
  const { push } = useToast();
  const [campagneId, setCampagneId] = useState('');
  const [methode, setMethode] = useState('prorata_valeur');
  const [base, setBase] = useState('');
  const baseN = Number(base.replace(/\s/g, '')) || 0;

  const create = useCoopMutation(
    async (coopId) => {
      const camp = campagnes.find((c) => c.id === campagneId);
      // apports de la campagne (hors annulations)
      const { data: apports } = await supabase.from('coop_apports')
        .select('membre_id, montant_xof, quantite_base')
        .eq('campagne_id', campagneId).is('annulation_de', null);
      const byMembre = new Map<string, number>();
      (apports ?? []).forEach((a: Record<string, unknown>) => {
        const key = a.membre_id as string;
        const val = methode === 'prorata_volume' ? (a.quantite_base as number) : (a.montant_xof as number);
        byMembre.set(key, (byMembre.get(key) ?? 0) + val);
      });
      const entries = [...byMembre.entries()].map(([membre_id, base_i]) => ({ membre_id, base_i }));
      if (!entries.length) throw new Error('Aucun apport sur cette campagne');
      const totalBase = entries.reduce((s, e) => s + e.base_i, 0);
      const shares = computeShares(baseN, entries);

      const { data: calcul, error } = await supabase.from('coop_calculs_ristournes').insert({
        cooperative_id: coopId, campagne_id: campagneId, section_id: camp?.section_id ?? null,
        methode, base_repartissable_xof: baseN, total_base: totalBase, nb_membres: entries.length,
        taux_bp: totalBase > 0 && methode === 'prorata_valeur' ? Math.round((baseN / totalBase) * 10000) : null,
        statut: 'simulation',
      }).select('id').single();
      if (error) throw error;

      const rows = shares.map((s) => ({ cooperative_id: coopId, calcul_id: calcul.id, membre_id: s.membre_id, base_membre: s.base_i, montant_xof: s.montant }));
      const { error: le } = await supabase.from('coop_lignes_ristournes_membres').insert(rows);
      if (le) throw le;
    },
    { invalidate: ['ristournes'], onSuccess: () => { onDone(); onClose(); } },
  );

  return (
    <Modal open onClose={onClose} title="Nouveau calcul de ristourne" subtitle="Simulation à partir des apports enregistrés (transactionnel, non déclaratif)"
      footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button variant="action" loading={create.isPending} disabled={!campagneId || baseN <= 0} onClick={() => { if (!campagneId) { push('error', 'Choisissez une campagne'); return; } create.mutate(undefined); }}>Simuler</Button></>}>
      <div className="space-y-4">
        <Field label="Campagne"><Select value={campagneId} onChange={(e) => setCampagneId(e.target.value)}><option value="">— choisir —</option>{campagnes.map((c) => <option key={c.id} value={c.id}>{c.nom}{c.coop_sections?.nom ? ` · ${c.coop_sections.nom}` : ''}</option>)}</Select></Field>
        <Field label="Méthode de répartition"><Select value={methode} onChange={(e) => setMethode(e.target.value)}>
          <option value="prorata_valeur">Prorata de la valeur des apports</option>
          <option value="prorata_volume">Prorata du volume des apports</option>
        </Select></Field>
        <Field label="Base répartissable (FCFA)" hint="Montant décidé en AG, après réserves légales et intérêt aux parts"><Input type="number" value={base} onChange={(e) => setBase(e.target.value)} placeholder="0" /></Field>
      </div>
    </Modal>
  );
}

function DetailModal({ calculId, onClose }: { calculId: string; onClose: () => void }) {
  const { push } = useToast();
  const { data, isLoading, refetch } = useCoopQuery(['ristourne-detail', calculId], async () => {
    const [calcul, lignes] = await Promise.all([
      supabase.from('coop_calculs_ristournes').select('*, coop_campagnes(nom)').eq('id', calculId).single(),
      supabase.from('coop_lignes_ristournes_membres').select('*, coop_membres(nom, prenoms, numero, telephone)').eq('calcul_id', calculId).order('montant_xof', { ascending: false }),
    ]);
    return { calcul: calcul.data as Record<string, unknown>, lignes: lignes.data ?? [] };
  });

  const verser = useCoopMutation(
    async (coopId) => {
      const calcul = data!.calcul;
      for (const l of data!.lignes as Record<string, unknown>[]) {
        if (l.verse) continue;
        const membre = l.coop_membres as { telephone?: string } | null;
        const { data: mvt, error } = await supabase.from('coop_mouvements_compte_membre').insert({
          cooperative_id: coopId, membre_id: l.membre_id, section_id: calcul.section_id, campagne_id: calcul.campagne_id,
          sens: 'credit', nature: 'ristourne', montant_xof: l.montant_xof as number,
          piece_type: 'calcul_ristourne', piece_id: calculId, libelle: 'Ristourne ' + ((calcul.coop_campagnes as { nom?: string } | null)?.nom ?? ''),
        }).select('id').single();
        if (error) throw error;
        await supabase.from('coop_lignes_ristournes_membres').update({ verse: true, mouvement_id: mvt.id }).eq('id', l.id);
        if (membre?.telephone) {
          await supabase.from('coop_notifications_sms').insert({ cooperative_id: coopId, membre_id: l.membre_id, telephone: membre.telephone, type: 'versement', message: `Atlas Coop: ristourne de ${formatFcfaText(l.montant_xof as number)} créditée sur votre compte (prorata de vos apports).`, source_type: 'calcul_ristourne', source_id: calculId });
        }
      }
      await supabase.from('coop_calculs_ristournes').update({ statut: 'verse' }).eq('id', calculId);
    },
    { invalidate: ['ristournes', 'ristourne-detail', 'dashboard', 'membres', 'comptes'], onSuccess: () => { push('success', 'Ristournes versées · reçus SMS'); refetch(); } },
  );

  const calcul = data?.calcul;
  const statut = calcul?.statut as string | undefined;
  const methode = calcul?.methode as string | undefined;

  return (
    <Modal open onClose={onClose} size="xl"
      title={`Ristourne — ${(calcul?.coop_campagnes as { nom?: string } | null)?.nom ?? ''}`}
      subtitle={calcul ? `${methode === 'prorata_volume' ? 'Prorata volume' : 'Prorata valeur'} · base ${formatFcfaText(calcul.base_repartissable_xof as number)}` : ''}
      footer={
        statut === 'verse'
          ? <Button variant="outline" onClick={onClose}>Fermer</Button>
          : <><Button variant="outline" onClick={onClose}>Fermer</Button><Button variant="action" loading={verser.isPending} onClick={() => verser.mutate(undefined)}><Send className="h-4 w-4" /> Verser sur les comptes</Button></>
      }>
      {isLoading || !calcul ? <Spinner /> : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Badge tone={statut === 'verse' ? 'action' : statut === 'valide' ? 'or' : 'neutre'} dot>{statut}</Badge>
            <span className="text-sm text-texte-2">{formatNumber(calcul.nb_membres as number)} membres · total apports {methode === 'prorata_volume' ? formatQty(calcul.total_base as number, 'kg') : formatFcfaText(calcul.total_base as number)}</span>
            {statut === 'verse' && <span className="flex items-center gap-1 text-sm text-action"><CheckCircle2 className="h-4 w-4" /> Versé</span>}
          </div>
          <Table>
            <THead><Th>Membre</Th><Th align="right">{methode === 'prorata_volume' ? 'Volume apporté' : 'Valeur apportée'}</Th><Th align="right">Part</Th><Th align="right"><span className="inline-flex items-center gap-1"><Coins className="h-3.5 w-3.5" /> Ristourne</span></Th></THead>
            <TBody>
              {(data!.lignes as Record<string, unknown>[]).map((l) => {
                const m = l.coop_membres as { nom?: string; prenoms?: string; numero?: string } | null;
                const part = (calcul.total_base as number) > 0 ? ((l.base_membre as number) / (calcul.total_base as number)) * 100 : 0;
                return (
                  <Tr key={l.id as string}>
                    <Td><span className="font-medium text-texte">{m?.nom} {m?.prenoms}</span> <span className="mono text-xs text-texte-2">{m?.numero}</span></Td>
                    <Td align="right" className="text-sm">{methode === 'prorata_volume' ? formatQty(l.base_membre as number, 'kg') : <Money value={l.base_membre as number} size="sm" suffix={false} />}</Td>
                    <Td align="right" className="text-sm text-texte-2">{part.toFixed(1)} %</Td>
                    <Td align="right"><Money value={l.montant_xof as number} size="sm" /></Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
          <p className="text-xs text-texte-2">Chaque membre peut vérifier son calcul : apports, total, taux, montant. Formule publiée (P5).</p>
        </div>
      )}
    </Modal>
  );
}
