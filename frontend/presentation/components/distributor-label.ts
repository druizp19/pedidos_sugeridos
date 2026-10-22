/** Display aliases only: original distributor keys remain unchanged for totals and sorting. */
const normalize = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');

const aliases: Record<string, string> = Object.fromEntries([
  ['DISTRIBUIDORA DROGUERIA ALFARO S.A.C.', 'ALFARO'],
  ['CBC LOGISTICS S.A.C.', 'CBC'],
  ['DISTRIBUIDORA CONTINENTAL 6 S.A.', 'CONTINENTAL'],
  ['REPRESENTACIONES DECO S.A.C', 'DECO'],
  ['DISTRIB. FARMACEUTICA LA LIBERTAD S.R.L.', 'DIFARLIB'],
  ['DIMEXA S.A.', 'DIMEXA'],
  ['DIMMSA S.R.L.', 'DIMMSA'],
  ['FARMIVENT SOCIEDAD ANONIMA CER', 'FARMIVENT'],
  ['DISTRIBUIDORA FARMACOS DEL NORTE S.A.C.', 'FDNORTE'],
  ['FARMACEUTICA DEL SUR S.R.L.', 'FDS'],
  ['HERSIL S.A.C.', 'HERSIL'],
  ['M & M PRODUCTOS MEDICOS Y FARMACEUTICOS E.I.R.L.', 'MYM'],
  ['MEDIFARMA S A', 'MIF'],
  ['MORAN DISTRIBUCIONES S A', 'MORAN'],
  ['QUIMICA SUIZA S A', 'QSUIZA'],
  ['UNION DE CERVECERIAS PERUANAS BACKUS Y JOHNSTON SOCIEDAD ANONIMA ABIERTA', 'BACKUS'],
  ['REPRESENTACIONES CASTILLO SOCIEDAD ANONIMA', 'CASTILLO'],
].map(([name, label]) => [normalize(name), label]));

export function distributorLabel(name: string): string {
  return aliases[normalize(name)] || name;
}
