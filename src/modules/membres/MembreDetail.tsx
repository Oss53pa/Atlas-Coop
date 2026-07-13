import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Phone, MapPin, Wallet, Coins, ShieldCheck, Plus, Minus, ArrowUpRight,
} from 'lucide-react';
import { useCoopQuery, supabase } from '../../hooks/data';
import {
  PageHeader, Card, CardHeader, CardBody, Money, Badge, Avatar, Spinner, Button, Tabs,
  Table, THead, TBody, Th, Tr, Td, EmptyState,
} from '../../ui';
import { STATUT_MEMBRE, CATEGORIE_MEMBRE, natureLabel } from '../../domain/labels';
import { formatDate, formatDateTime, formatDateLong } from '../../lib/format';
import { formatQty } from '../../lib/units';
import type {
  CoopMembre, CoopMouvement, CategorieMembre, MembreStatut,
  CoopPartsLiberation, CoopGarantie,
} from '../../domain/database.types';
import { MouvementForm } from './MouvementForm';

type Tab = 'compte' | 'parts' | 'garanties' | 'apercu';

export function MembreDetail() {
  const { id, membreId } = useParams();
  const mid = id ?? membreId!;
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('apercu');
  const [mvtForm, setMvtForm] = useState<null | 'credit' | 'debit'>(null);

  const { data, isLoading } = useCoopQuery(['membre', mid], async () => {
    const [membre, compte, mouvements, cats, liberations, souscriptions, garanties] = await Promise.all([
      supabase.from('coop_membres').select('*').eq('id', mid).single(),
      supabase.from('coop_comptes_membres').select('solde_xof').eq('membre_id', mid).maybeSingle(),
      supabase.from('coop_mouvements_compte_membre').select('*').eq('membre_id', mid).order('created_at', { ascending: false }).limit(100),
      supabase.from('coop_membres_categories').select('categorie').eq('membre_id', mid),
      supabase.from('coop_parts_liberations').select('*').eq('membre_id', mid).order('date_liberation', { ascending: false }),
      supabase.from('coop_parts_souscriptions').select('nombre, valeur_nominale_xof').eq('membre_id', mid),
      supabase.from('coop_garanties').select('*').eq('membre_id', mid).order('created_at', { ascending: false }),
    ]);
    const partsLib = ((liberations.data ?? []) as CoopPartsLiberation[]).reduce((s, l) => s + l.nombre, 0);
    const capitalLib = ((liberations.data ?? []) as CoopPartsLiberation[]).reduce((s, l) => s + l.montant_xof, 0);
    const partsSous = ((souscriptions.data ?? []) as { nombre: number }[]).reduce((s, l) => s + l.nombre, 0);
    return {
      membre: membre.data as CoopMembre,
      solde: compte.data?.solde_xof ?? 0,
      mouvements: (mouvements.data ?? []) as CoopMouvement[],
      cats: (cats.data ?? []).map((c) => c.categorie as CategorieMembre),
      liberations: (liberations.data ?? []) as CoopPartsLiberation[],
      partsLib, partsSous, capitalLib,
      garanties: (garanties.data ?? []) as CoopGarantie[],
    };
  });

  if (isLoading || !data) return <Spinner label="Chargement de la fiche membre…" />;
  const { membre, solde, mouvements, cats } = data;
  const st = STATUT_MEMBRE[membre.statut as MembreStatut];

  return (
    <>
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1.5 text-sm text-texte-2 hover:text-texte">
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      <PageHeader
        title={<span className="flex items-center gap-3"><Avatar name={`${membre.nom} ${membre.prenoms ?? ''}`} src={membre.photo_url} size="lg" />{membre.nom} {membre.prenoms}</span>}
        subtitle={<span className="mono">{membre.numero}</span>}
        actions={
          <>
            <Button variant="outline" onClick={() => setMvtForm('debit')}><Minus className="h-4 w-4" /> Avance / prélèvement</Button>
            <Button variant="action" onClick={() => setMvtForm('credit')}><Plus className="h-4 w-4" /> Créditer</Button>
          </>
        }
      />

      {/* En-tête synthèse */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardBody>
          <div className="flex items-center gap-2 text-sm text-texte-2"><Wallet className="h-4 w-4" /> Solde compte</div>
          <div className="mt-1"><Money value={solde} colorNegative size="xl" suffix={false} /></div>
        </CardBody></Card>
        <Card><CardBody>
          <div className="flex items-center gap-2 text-sm text-texte-2"><Coins className="h-4 w-4" /> Parts libérées</div>
          <div className="mt-1 text-2xl font-bold text-texte">{data.partsLib}<span className="text-sm font-normal text-texte-2"> / {data.partsSous}</span></div>
        </CardBody></Card>
        <Card><CardBody>
          <div className="flex items-center gap-2 text-sm text-texte-2"><Coins className="h-4 w-4" /> Capital libéré</div>
          <div className="mt-1"><Money value={data.capitalLib} suffix={false} size="lg" /></div>
        </CardBody></Card>
        <Card><CardBody>
          <div className="flex items-center gap-2 text-sm text-texte-2">Statut</div>
          <div className="mt-2"><Badge tone={st.tone} dot>{st.label}</Badge></div>
        </CardBody></Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs
            className="mb-4"
            value={tab}
            onChange={setTab}
            tabs={[
              { key: 'apercu', label: 'Aperçu' },
              { key: 'compte', label: 'Compte', count: mouvements.length },
              { key: 'parts', label: 'Parts', count: data.liberations.length },
              { key: 'garanties', label: 'Garanties', count: data.garanties.length },
            ]}
          />

          {tab === 'apercu' && (
            <Card><CardBody className="space-y-3 text-sm">
              <InfoRow label="Téléphone" value={membre.telephone ?? '—'} icon={<Phone className="h-4 w-4" />} />
              <InfoRow label="Localité" value={membre.village ?? membre.localite ?? '—'} icon={<MapPin className="h-4 w-4" />} />
              <InfoRow label="Date d'entrée" value={membre.date_entree ? formatDateLong(membre.date_entree) : '—'} />
              <InfoRow label="Sexe" value={membre.sexe === 'F' ? 'Féminin' : membre.sexe === 'M' ? 'Masculin' : '—'} />
              <InfoRow label="Pièce" value={membre.piece_numero ? `${membre.piece_type ?? ''} ${membre.piece_numero}` : '—'} />
              <div className="pt-2">
                <div className="mb-1.5 text-xs font-semibold uppercase text-texte-2">Catégories</div>
                <div className="flex flex-wrap gap-1.5">
                  {cats.length ? cats.map((c) => <Badge key={c} tone="primaire">{CATEGORIE_MEMBRE[c]}</Badge>) : <span className="text-texte-2">Aucune</span>}
                </div>
              </div>
            </CardBody></Card>
          )}

          {tab === 'compte' && (
            <Card>
              <CardHeader title="Grand livre individuel" subtitle="Chaque ligne est traçable jusqu'à sa pièce (P1)" />
              <CardBody className="p-0">
                {mouvements.length === 0 ? (
                  <EmptyState title="Aucun mouvement" description="Aucune opération sur ce compte." />
                ) : (
                  <Table>
                    <THead>
                      <Th>Date</Th><Th>Nature</Th><Th>Quantité</Th><Th align="right">Montant</Th>
                    </THead>
                    <TBody>
                      {mouvements.map((m) => (
                        <Tr key={m.id}>
                          <Td className="whitespace-nowrap text-xs text-texte-2">{formatDateTime(m.created_at)}</Td>
                          <Td>
                            <div className="font-medium text-texte">{natureLabel(m.nature)}</div>
                            {m.piece_ref && <div className="mono text-xs text-texte-2">{m.piece_ref}</div>}
                          </Td>
                          <Td className="text-xs text-texte-2">
                            {m.quantite_base && m.unite_base ? formatQty(m.quantite_base, m.unite_base === 'g' ? 'kg' : m.unite_base === 'ml' ? 'L' : 'u') : '—'}
                          </Td>
                          <Td align="right">
                            <Money value={m.sens === 'credit' ? m.montant_xof : -m.montant_xof} colorNegative size="sm" sign />
                          </Td>
                        </Tr>
                      ))}
                    </TBody>
                  </Table>
                )}
              </CardBody>
            </Card>
          )}

          {tab === 'parts' && (
            <Card>
              <CardHeader title="Libérations de parts" subtitle="Capital social du membre" />
              <CardBody className="p-0">
                {data.liberations.length === 0 ? (
                  <EmptyState title="Aucune libération" description="Souscription/libération de parts à enregistrer dans le module Capital." action={<Link to="/capital"><Button variant="outline" size="sm">Aller au capital</Button></Link>} />
                ) : (
                  <Table>
                    <THead><Th>Date</Th><Th>Mode</Th><Th align="center">Parts</Th><Th align="right">Montant</Th></THead>
                    <TBody>
                      {data.liberations.map((l) => (
                        <Tr key={l.id}>
                          <Td className="text-xs text-texte-2">{formatDate(l.date_liberation)}</Td>
                          <Td className="capitalize">{l.mode.replace('_', ' ')}</Td>
                          <Td align="center">{l.nombre}</Td>
                          <Td align="right"><Money value={l.montant_xof} size="sm" /></Td>
                        </Tr>
                      ))}
                    </TBody>
                  </Table>
                )}
              </CardBody>
            </Card>
          )}

          {tab === 'garanties' && (
            <Card>
              <CardHeader title="Garanties & cautions" icon={<ShieldCheck className="h-5 w-5" />} />
              <CardBody className="p-0">
                {data.garanties.length === 0 ? (
                  <EmptyState title="Aucune garantie" description="Cautions solidaires, nantissements de parts ou gages sur production." />
                ) : (
                  <ul className="divide-y divide-ligne/60">
                    {data.garanties.map((g) => (
                      <li key={g.id} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <div className="font-medium text-texte capitalize">{g.type.replace(/_/g, ' ')}</div>
                          <div className="text-xs text-texte-2">{g.description ?? ''}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Money value={g.montant_couvert_xof} size="sm" />
                          <Badge tone={g.statut === 'active' ? 'action' : g.statut === 'mise_en_jeu' ? 'alerte' : 'neutre'}>{g.statut}</Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          )}
        </div>

        {/* Colonne latérale : derniers apports */}
        <div>
          <Card>
            <CardHeader title="Résumé compte" />
            <CardBody className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-texte-2">Solde actuel</span><Money value={solde} size="sm" colorNegative /></div>
              <div className="flex justify-between"><span className="text-texte-2">Mouvements</span><span className="font-medium">{mouvements.length}</span></div>
              <div className="flex justify-between"><span className="text-texte-2">Plafond crédit</span><Money value={membre.plafond_credit_xof} size="sm" /></div>
              <div className="mt-2 flex items-start gap-2 rounded-lg bg-surface-2 p-2.5 text-xs text-texte-2">
                <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-action" />
                Chaque crédit/débit envoie un reçu SMS au membre (P3, P5).
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {mvtForm && (
        <MouvementForm
          open={!!mvtForm}
          sens={mvtForm}
          membre={membre}
          onClose={() => setMvtForm(null)}
        />
      )}
    </>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-ligne/60 pb-2 last:border-0">
      <span className="flex items-center gap-2 text-texte-2">{icon}{label}</span>
      <span className="font-medium text-texte">{value}</span>
    </div>
  );
}
