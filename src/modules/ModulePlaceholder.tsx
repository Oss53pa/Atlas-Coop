import { Construction } from 'lucide-react';
import { PageHeader, Card, CardBody, Badge } from '../ui';

export function ModulePlaceholder({
  module,
  title,
  description,
  phase,
  points,
}: {
  module: string;
  title: string;
  description: string;
  phase?: number;
  points?: string[];
}) {
  return (
    <>
      <PageHeader
        title={title}
        subtitle={description}
        actions={<Badge tone="primaire">{module}</Badge>}
      />
      <Card>
        <CardBody className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-or-fcfa/10 text-or-fcfa">
            <Construction className="h-7 w-7" />
          </div>
          <div>
            <h3 className="font-semibold text-texte">Module planifié{phase ? ` — Phase ${phase}` : ''}</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-texte-2">
              Le socle de données, la RLS multitenant et la comptabilité analytique sont déjà
              opérationnels pour cette section (framework A1). L'interface arrive dans la phase indiquée.
            </p>
          </div>
          {points && points.length > 0 && (
            <ul className="mx-auto max-w-md space-y-1.5 text-left text-sm text-texte-2">
              {points.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-action" />
                  {p}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </>
  );
}
