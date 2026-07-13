import { useState, useMemo } from 'react';
import { Scale, Check, Camera, MapPin, Fish, Package } from 'lucide-react';
import { useCoopQuery, useCoopMutation, supabase } from '../../hooks/data';
import {
  PageHeader, Card, CardHeader, CardBody, Button, Field, Input, Select, Money,
  EmptyState, useToast, Avatar,
} from '../../ui';
import { MembrePicker } from '../../components/MembrePicker';
import { toBase, formatQty, DISPLAY_UNITS } from '../../lib/units';
import { formatFcfaText } from '../../lib/money';
import { formatDateTime } from '../../lib/format';
import type { CoopCampagne, CoopProduit } from '../../domain/database.types';

interface PrixRow { id: string; produit_id: string | null; calibre: string | null; prix_planche_xof: number; prix_definitif_xof: number | null; coop_produits: CoopProduit | null }
interface Picked { id: string; numero: string; nom: string; prenoms: string | null; telephone: string | null; photo_url: string | null }

export function CollectePage() {
  const { push } = useToast();
  const [campagneId, setCampagneId] = useState<string>('');
  const [membre, setMembre] = useState<Picked | null>(null);
  const [prixId, setPrixId] = useState<string>('');
  const [qty, setQty] = useState('');
  const [prixManuel, setPrixManuel] = useState('');
  const [calibre, setCalibre] = useState('');
  const [parcelleId, setParcelleId] = useState('');

  const { data: parcelles } = useCoopQuery(['parcelles-membre', membre?.id], async (coopId) => {
    if (!membre) return [];
    const { data } = await supabase.from('coop_parcelles').select('id, code, nom')
      .eq('cooperative_id', coopId).eq('membre_id', membre.id).eq('actif', true);
    return (data ?? []) as { id: string; code: string; nom: string | null }[];
  }, { enabled: !!membre });

  const { data: campagnes } = useCoopQuery(['campagnes-ouvertes'], async (coopId) => {
    const { data } = await supabase.from('coop_campagnes').select('*, coop_sections(nom, unite_affichage)')
      .eq('cooperative_id', coopId).eq('statut', 'ouverte').order('date_debut', { ascending: false });
    return (data ?? []) as (CoopCampagne & { coop_sections: { nom: string; unite_affichage: string } | null })[];
  });

  const { data: prixList } = useCoopQuery(['prix-campagne', campagneId], async () => {
    if (!campagneId) return [];
    const { data } = await supabase.from('coop_prix_campagne')
      .select('id, produit_id, calibre, prix_planche_xof, prix_definitif_xof, coop_produits(*)')
      .eq('campagne_id', campagneId);
    return (data ?? []) as unknown as PrixRow[];
  }, { enabled: !!campagneId });

  const { data: recents, refetch } = useCoopQuery(['apports-recents'], async (coopId) => {
    const { data } = await supabase.from('coop_apports')
      .select('id, quantite_base, unite_base, montant_xof, created_at, calibre, coop_membres(nom, prenoms, numero)')
      .eq('cooperative_id', coopId).order('created_at', { ascending: false }).limit(10);
    return data ?? [];
  });

  const campagne = campagnes?.find((c) => c.id === campagneId);
  const selectedPrix = prixList?.find((p) => p.id === prixId);
  const produit = selectedPrix?.coop_produits ?? null;
  const uniteAff = produit?.unite_affichage ?? campagne?.coop_sections?.unite_affichage ?? 'kg';
  const uniteBase = produit?.unite_base ?? 'g';

  const prixUnitaire = useMemo(() => {
    if (selectedPrix) return selectedPrix.prix_definitif_xof ?? selectedPrix.prix_planche_xof;
    return Number(prixManuel.replace(/\s/g, '')) || 0;
  }, [selectedPrix, prixManuel]);

  const qtyN = Number(qty.replace(',', '.')) || 0;
  const montant = Math.round(qtyN * prixUnitaire);

  const save = useCoopMutation(
    async (coopId) => {
      if (!membre) throw new Error('Sélectionnez un membre');
      const quantiteBase = toBase(qtyN, uniteAff);
      const { data: apport, error } = await supabase.from('coop_apports').insert({
        cooperative_id: coopId,
        campagne_id: campagneId || null,
        section_id: campagne?.section_id ?? null,
        membre_id: membre.id,
        produit_id: produit?.id ?? null,
        quantite_base: quantiteBase,
        unite_base: uniteBase,
        calibre: calibre || selectedPrix?.calibre || null,
        prix_unitaire_xof: prixUnitaire,
        montant_xof: montant,
        parcelle_id: parcelleId || null,
        source: 'manuel',
      }).select('id').single();
      if (error) throw error;

      // Reçu SMS (P5) — le crédit au compte est généré par trigger (P6)
      if (membre.telephone) {
        await supabase.from('coop_notifications_sms').insert({
          cooperative_id: coopId, membre_id: membre.id, telephone: membre.telephone, type: 'recu_pesee',
          message: `Atlas Coop: apport ${formatQty(quantiteBase, uniteAff)} au prix de ${formatFcfaText(prixUnitaire)}/${DISPLAY_UNITS[uniteAff]?.label ?? uniteAff}. Montant crédité: ${formatFcfaText(montant)}.`,
          source_type: 'apport', source_id: apport.id,
        });
      }
    },
    {
      invalidate: ['apports-recents', 'dashboard', 'membres'],
      onSuccess: () => {
        push('success', `Apport enregistré · ${formatFcfaText(montant)} crédité${membre?.telephone ? ' · reçu SMS' : ''}`);
        setQty(''); setCalibre(''); setMembre(null); setParcelleId('');
        refetch();
      },
    },
  );

  const canSave = membre && qtyN > 0 && prixUnitaire > 0;

  return (
    <>
      <PageHeader
        title="Collecte terrain"
        subtitle="Pesée → valorisation au prix du jour → crédit du compte membre + reçu SMS (P6, offline-first)."
        icon={<Scale className="h-5 w-5" />}
      />

      {!campagnes?.length ? (
        <EmptyState
          icon={<Scale className="h-8 w-8" />}
          title="Aucune campagne ouverte"
          description="Ouvrez une campagne (avec ses prix planchers) dans le module Campagnes pour démarrer la collecte."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card>
              <CardHeader title="1 · Campagne & membre" icon={<Fish className="h-5 w-5" />} />
              <CardBody className="space-y-4">
                <Field label="Campagne">
                  <Select value={campagneId} onChange={(e) => { setCampagneId(e.target.value); setPrixId(''); }}>
                    <option value="">— Choisir —</option>
                    {campagnes.map((c) => (
                      <option key={c.id} value={c.id}>{c.nom} {c.coop_sections?.nom ? `· ${c.coop_sections.nom}` : ''}</option>
                    ))}
                  </Select>
                </Field>
                {membre ? (
                  <div className="flex items-center justify-between rounded-lg border border-action/30 bg-action/5 p-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={`${membre.nom} ${membre.prenoms ?? ''}`} src={membre.photo_url} size="sm" />
                      <div>
                        <div className="font-medium text-texte">{membre.nom} {membre.prenoms}</div>
                        <div className="mono text-xs text-texte-2">{membre.numero}</div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setMembre(null)}>Changer</Button>
                  </div>
                ) : (
                  <MembrePicker value={null} onChange={(m) => setMembre(m)} />
                )}
              </CardBody>
            </Card>

            {campagneId && membre && (
              <Card>
                <CardHeader title="2 · Apport" icon={<Package className="h-5 w-5" />} />
                <CardBody className="space-y-4">
                  {prixList && prixList.length > 0 ? (
                    <Field label="Produit / calibre (prix du jour)">
                      <Select value={prixId} onChange={(e) => setPrixId(e.target.value)}>
                        <option value="">— Choisir —</option>
                        {prixList.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.coop_produits?.nom ?? 'Produit'} {p.calibre ? `(${p.calibre})` : ''} — {formatFcfaText(p.prix_definitif_xof ?? p.prix_planche_xof)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  ) : (
                    <Field label="Prix unitaire (FCFA / unité)" hint="Aucun prix de campagne défini — saisie manuelle">
                      <Input type="number" value={prixManuel} onChange={(e) => setPrixManuel(e.target.value)} placeholder="0" />
                    </Field>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <Field label={`Quantité (${DISPLAY_UNITS[uniteAff]?.label ?? uniteAff})`} required>
                      <Input type="number" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" className="text-lg font-semibold" />
                    </Field>
                    <Field label="Calibre / qualité">
                      <Input value={calibre} onChange={(e) => setCalibre(e.target.value)} placeholder="Ex. gros / 1er choix" />
                    </Field>
                  </div>

                  {parcelles && parcelles.length > 0 && (
                    <Field label="Parcelle d'origine" hint="Traçabilité parcelle → apport (rendement/ha)">
                      <Select value={parcelleId} onChange={(e) => setParcelleId(e.target.value)}>
                        <option value="">— aucune —</option>
                        {parcelles.map((p) => <option key={p.id} value={p.id}>{p.nom || p.code}</option>)}
                      </Select>
                    </Field>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled><Camera className="h-4 w-4" /> Photo ticket</Button>
                    <Button variant="outline" size="sm" disabled><MapPin className="h-4 w-4" /> GPS</Button>
                    <span className="self-center text-xs text-texte-2">(capture terrain — app mobile)</span>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>

          {/* Récapitulatif + validation */}
          <div className="space-y-4">
            <Card className="sticky top-20">
              <CardHeader title="Valorisation" />
              <CardBody className="space-y-3">
                <Row label="Quantité" value={qtyN > 0 ? formatQty(toBase(qtyN, uniteAff), uniteAff) : '—'} />
                <Row label="Prix unitaire" value={prixUnitaire > 0 ? <Money value={prixUnitaire} size="sm" /> : '—'} />
                <div className="border-t border-ligne pt-3">
                  <div className="text-sm text-texte-2">Montant crédité</div>
                  <div className="mt-1"><Money value={montant} size="xl" suffix={false} /></div>
                </div>
                <Button
                  variant="action" size="lg" className="w-full justify-center"
                  disabled={!canSave} loading={save.isPending}
                  onClick={() => save.mutate(undefined)}
                >
                  <Check className="h-5 w-5" /> Valider l'apport
                </Button>
                <p className="text-center text-xs text-texte-2">Écriture immuable · reçu SMS automatique</p>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* Apports récents */}
      <Card className="mt-6">
        <CardHeader title="Apports récents" />
        <CardBody className="p-0">
          {!recents?.length ? (
            <div className="py-8 text-center text-sm text-texte-2">Aucun apport enregistré.</div>
          ) : (
            <ul className="divide-y divide-ligne/60">
              {recents.map((a: Record<string, unknown>) => {
                const m = a.coop_membres as { nom?: string; prenoms?: string; numero?: string } | null;
                return (
                  <li key={a.id as string} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <div className="text-sm font-medium text-texte">{m?.nom} {m?.prenoms}</div>
                      <div className="text-xs text-texte-2">
                        {formatQty(a.quantite_base as number, (a.unite_base as string) === 'g' ? 'kg' : (a.unite_base as string) === 'ml' ? 'L' : 'u')}
                        {a.calibre ? ` · ${a.calibre}` : ''} · {formatDateTime(a.created_at as string)}
                      </div>
                    </div>
                    <Money value={a.montant_xof as number} size="sm" />
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex items-center justify-between text-sm"><span className="text-texte-2">{label}</span><span className="font-medium text-texte">{value}</span></div>;
}
