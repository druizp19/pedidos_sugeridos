import { formatPublicationDate } from '@/lib/utils';

export function PublicationDate({value}:{value: string | null | undefined}) {
  const label = formatPublicationDate(value);
  return <span className="text-[11px] text-muted-foreground" title="Publicación o última corrección de la entrega. Hora de Lima.">
    {label ? <>Publicación: <time dateTime={value!}>{label}</time> · Lima</>
      : value === undefined ? 'Consultando publicación…' : 'Sin fecha de publicación registrada'}
  </span>;
}
