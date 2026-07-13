import { useState, useMemo } from 'react';
import { MessageSquare, Send, CheckCheck, Clock, XCircle } from 'lucide-react';
import { useCoopQuery, useCoopMutation, supabase } from '../../hooks/data';
import {
  PageHeader, Card, CardHeader, CardBody, Stat, Badge, Tabs, Spinner, EmptyState, Button, useToast,
} from '../../ui';
import { formatDateTime } from '../../lib/format';
import type { CoopNotificationSms } from '../../domain/database.types';

const TYPE_LABEL: Record<string, string> = {
  recu_pesee: 'Reçu de pesée', versement: 'Versement', confirmation_avance: 'Confirmation d\'avance',
  convocation: 'Convocation AG', rappel: 'Rappel', alerte: 'Alerte', accord_caution: 'Accord de caution',
};

export function CanalMembrePage() {
  const { push } = useToast();
  const [tab, setTab] = useState<'tous' | 'file' | 'envoye' | 'echec'>('tous');

  const { data, isLoading, refetch } = useCoopQuery(['sms'], async (coopId) => {
    const { data } = await supabase.from('coop_notifications_sms')
      .select('*, coop_membres(nom, prenoms, numero)')
      .eq('cooperative_id', coopId).order('created_at', { ascending: false }).limit(200);
    return (data ?? []) as (CoopNotificationSms & { coop_membres: { nom?: string; prenoms?: string; numero?: string } | null })[];
  });

  const counts = useMemo(() => {
    const c = { tous: data?.length ?? 0, file: 0, envoye: 0, echec: 0 };
    data?.forEach((s) => { c[s.statut as 'file' | 'envoye' | 'echec']++; });
    return c;
  }, [data]);

  const filtered = useMemo(() => (tab === 'tous' ? data ?? [] : (data ?? []).filter((s) => s.statut === tab)), [data, tab]);

  const markSent = useCoopMutation(
    async (coopId) => {
      // Dispatch via Edge Function (service_role côté serveur, CDC §3)
      const { data, error } = await supabase.functions.invoke('coop-sms-dispatch', {
        body: { cooperative_id: coopId },
      });
      if (error) throw error;
      return data as { processed: number; sent: number; gateway: string };
    },
    {
      invalidate: ['sms'],
      onSuccess: (r) => {
        push('success', `Dispatch : ${r?.sent ?? 0} SMS envoyés (passerelle ${r?.gateway ?? 'simulée'})`);
        refetch();
      },
    },
  );

  return (
    <>
      <PageHeader
        title="Canal membre"
        subtitle="Journal des SMS/USSD — preuve de notification opposable en litige (P5)."
        icon={<MessageSquare className="h-5 w-5" />}
        actions={counts.file > 0 ? <Button variant="action" loading={markSent.isPending} onClick={() => markSent.mutate(undefined)}><Send className="h-4 w-4" /> Traiter la file ({counts.file})</Button> : undefined}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total SMS" value={counts.tous} icon={<MessageSquare className="h-4 w-4" />} />
        <Stat label="En file" value={counts.file} tone="or" icon={<Clock className="h-4 w-4" />} />
        <Stat label="Envoyés" value={counts.envoye} tone="action" icon={<CheckCheck className="h-4 w-4" />} />
        <Stat label="Échecs" value={counts.echec} tone="alerte" icon={<XCircle className="h-4 w-4" />} />
      </div>

      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[
        { key: 'tous', label: 'Tous', count: counts.tous },
        { key: 'file', label: 'En file', count: counts.file },
        { key: 'envoye', label: 'Envoyés', count: counts.envoye },
        { key: 'echec', label: 'Échecs', count: counts.echec },
      ]} />

      {isLoading ? <Spinner /> : !filtered.length ? (
        <EmptyState icon={<MessageSquare className="h-8 w-8" />} title="Aucun SMS" description="Les reçus de pesée, versements et convocations apparaîtront ici." />
      ) : (
        <Card>
          <CardHeader title="Journal des envois" subtitle="Reçu SMS systématique à chaque opération (P5)" />
          <CardBody className="p-0">
            <ul className="divide-y divide-ligne/60">
              {filtered.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge tone="primaire">{TYPE_LABEL[s.type] ?? s.type}</Badge>
                      <span className="text-sm font-medium text-texte">
                        {s.coop_membres ? `${s.coop_membres.nom ?? ''} ${s.coop_membres.prenoms ?? ''}`.trim() : s.telephone}
                      </span>
                      <span className="mono text-xs text-texte-2">{s.telephone}</span>
                    </div>
                    <p className="mt-1 truncate text-sm text-texte-2">{s.message}</p>
                    <div className="mt-0.5 text-xs text-texte-2">{formatDateTime(s.created_at)}</div>
                  </div>
                  <Badge tone={s.statut === 'envoye' ? 'action' : s.statut === 'echec' ? 'alerte' : 'or'} dot>
                    {s.statut === 'envoye' ? 'Envoyé' : s.statut === 'echec' ? 'Échec' : 'En file'}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </>
  );
}
