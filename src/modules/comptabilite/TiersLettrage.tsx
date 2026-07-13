import { useState } from 'react';
import { Users, Link2, Check } from 'lucide-react';
import { useCoopQuery, useCoopMutation, supabase } from '../../hooks/data';
import {
  Card, CardHeader, CardBody, Badge, Money, Select, Modal, Button, Spinner, EmptyState, useToast,
  Table, THead, TBody, Th, Tr, Td,
} from '../../ui';
import { formatDate } from '../../lib/format';

const COMPTES = [
  { numero: '462', label: 'Membres — comptes courants (à payer)' },
  { numero: '463', label: 'Membres — avances et crédits' },
  { numero: '401', label: 'Fournisseurs' },
  { numero: '411', label: 'Clients' },
];

interface TiersRow { tiers_type: string; tiers_id: string; tiers_nom: string; debit: number; credit: number; solde: number; nb_ouverts: number }

export function TiersLettrage() {
  const [compte, setCompte] = useState('462');
  const [detail, setDetail] = useState<TiersRow | null>(null);

  const { data, isLoading, refetch } = useCoopQuery(['balance-tiers', compte], async (coopId) => {
    const { data } = await supabase.rpc('coop_balance_tiers', { p_coop: coopId, p_compte: compte });
    return (data ?? []) as TiersRow[];
  });

  const totalSolde = (data ?? []).reduce((s, r) => s + r.solde, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Users className="h-5 w-5 text-primaire" />
        <Select value={compte} onChange={(e) => setCompte(e.target.value)} className="w-auto">
          {COMPTES.map((c) => <option key={c.numero} value={c.numero}>{c.numero} — {c.label}</option>)}
        </Select>
        <span className="text-sm text-texte-2">Postes ouverts (non lettrés)</span>
      </div>

      <Card>
        <CardHeader title="Balance auxiliaire par tiers" subtitle={`Compte collectif ${compte} · grand livre auxiliaire`} />
        <CardBody className="p-0">
          {isLoading ? <Spinner /> : !data?.length ? (
            <EmptyState icon={<Users className="h-8 w-8" />} title="Aucun poste ouvert" description="Aucun tiers avec solde non lettré sur ce compte." />
          ) : (
            <Table>
              <THead><Th>Tiers</Th><Th align="center">Postes</Th><Th align="right">Débit</Th><Th align="right">Crédit</Th><Th align="right">Solde</Th><Th></Th></THead>
              <TBody>
                {data.map((r) => (
                  <Tr key={r.tiers_id}>
                    <Td className="font-medium text-texte">{r.tiers_nom}</Td>
                    <Td align="center"><Badge tone="neutre">{r.nb_ouverts}</Badge></Td>
                    <Td align="right"><Money value={r.debit} size="sm" suffix={false} /></Td>
                    <Td align="right"><Money value={r.credit} size="sm" suffix={false} /></Td>
                    <Td align="right"><Money value={r.solde} size="sm" suffix={false} colorNegative /></Td>
                    <Td align="right"><Button variant="outline" size="sm" onClick={() => setDetail(r)}><Link2 className="h-4 w-4" /> Lettrer</Button></Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>
      {!!data?.length && (
        <div className="flex justify-end rounded-xl border border-ligne bg-surface-2 p-3 text-sm">
          <span className="mr-2 text-texte-2">Solde total du compte {compte} :</span><Money value={totalSolde} size="sm" suffix={false} colorNegative />
        </div>
      )}

      {detail && <LettrageModal compte={compte} tiers={detail} onClose={() => { setDetail(null); refetch(); }} />}
    </div>
  );
}

function LettrageModal({ compte, tiers, onClose }: { compte: string; tiers: TiersRow; onClose: () => void }) {
  const { push } = useToast();
  const [sel, setSel] = useState<Set<string>>(new Set());

  const { data: lignes, isLoading, refetch } = useCoopQuery(['tiers-lignes', compte, tiers.tiers_id], async (coopId) => {
    const { data } = await supabase.from('coop_lignes_ecritures')
      .select('id, debit_xof, credit_xof, libelle, lettrage_code, coop_ecritures(numero, date_ecriture)')
      .eq('cooperative_id', coopId).eq('compte_numero', compte).eq('tiers_id', tiers.tiers_id)
      .order('created_at');
    return data ?? [];
  });

  const selLignes = (lignes ?? []).filter((l: Record<string, unknown>) => sel.has(l.id as string) && !l.lettrage_code);
  const selD = selLignes.reduce((s, l: Record<string, unknown>) => s + (l.debit_xof as number), 0);
  const selC = selLignes.reduce((s, l: Record<string, unknown>) => s + (l.credit_xof as number), 0);
  const equilibre = selD === selC && selD > 0;

  const lettrer = useCoopMutation(
    async (coopId) => {
      const { error } = await supabase.rpc('coop_lettrer', { p_coop: coopId, p_lignes: [...sel] });
      if (error) throw error;
    },
    { invalidate: ['balance-tiers', 'tiers-lignes'], onSuccess: () => { push('success', 'Lettrage effectué'); setSel(new Set()); refetch(); } },
  );

  const toggle = (id: string) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <Modal open onClose={onClose} size="lg" title={`Lettrage — ${tiers.tiers_nom}`} subtitle={`Compte ${compte} · cochez des postes dont débit = crédit`}
      footer={<><Button variant="outline" onClick={onClose}>Fermer</Button><Button variant="primary" loading={lettrer.isPending} disabled={!equilibre} onClick={() => lettrer.mutate(undefined)}><Check className="h-4 w-4" /> Lettrer{!equilibre && sel.size > 0 ? ' (déséquilibré)' : ''}</Button></>}>
      {isLoading ? <Spinner /> : (
        <div className="space-y-3">
          <Table>
            <THead><Th></Th><Th>Écriture</Th><Th>Date</Th><Th align="right">Débit</Th><Th align="right">Crédit</Th><Th>Lettrage</Th></THead>
            <TBody>
              {(lignes ?? []).map((l: Record<string, unknown>) => {
                const e = l.coop_ecritures as { numero?: string; date_ecriture?: string } | null;
                const lettered = Boolean(l.lettrage_code);
                return (
                  <Tr key={l.id as string}>
                    <Td><input type="checkbox" disabled={lettered} checked={sel.has(l.id as string)} onChange={() => toggle(l.id as string)} className="h-4 w-4 rounded border-ligne text-primaire" /></Td>
                    <Td><span className="mono text-xs">{e?.numero ?? '—'}</span></Td>
                    <Td className="text-xs text-texte-2">{e?.date_ecriture ? formatDate(e.date_ecriture) : '—'}</Td>
                    <Td align="right">{(l.debit_xof as number) ? <Money value={l.debit_xof as number} size="sm" suffix={false} /> : '—'}</Td>
                    <Td align="right">{(l.credit_xof as number) ? <Money value={l.credit_xof as number} size="sm" suffix={false} /> : '—'}</Td>
                    <Td>{lettered ? <Badge tone="action">{l.lettrage_code as string}</Badge> : <span className="text-texte-2">—</span>}</Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
          {sel.size > 0 && (
            <div className={`rounded-lg p-2 text-sm ${equilibre ? 'bg-action/10 text-action' : 'bg-alerte/10 text-alerte'}`}>
              Sélection : débit {selD.toLocaleString('fr-FR')} · crédit {selC.toLocaleString('fr-FR')} — {equilibre ? 'équilibré, lettrable' : 'doit être équilibré pour lettrer'}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
