import ExcelJS from 'exceljs';
import type { MatrixResponse, ClientMatrixResponse } from '@/types';
import { WorkQueue } from '../runtime/work-queue';
const queue = new WorkQueue(1, 8, 20000);
export function workbook(data: MatrixResponse | ClientMatrixResponse, version: string): Promise<Buffer> {
  return queue.run(async () => {
    const book = new ExcelJS.Workbook(); book.creator = 'Medifarma · Pedidos Sugeridos';
    const sheet = book.addWorksheet('Pedidos sugeridos');
    const clients = 'client_columns' in data ? data.client_columns : [];
    const distributors = 'distributors' in data ? data.distributors || [] : [];
    const heads = ['Marca / presentación','Unidad de negocio','Franquicia','Venta mensual','Mercado mensual','MS actual','MS anterior','MS territorio','MS ideal','Estimación mensual',
      ...clients.flatMap(c=>[`${c.cp_cliente} · Compra`,`${c.cp_cliente} · Quintil`]), ...distributors];
    sheet.addRow([`Pedidos Sugeridos · ${version} · ${data.periodo} · ${data.unidad_medida}`]);
    sheet.mergeCells(1,1,1,heads.length);
    if ('client' in data) sheet.addRow([`${data.client.ruc} · ${data.client.farmacia}`]);
    sheet.addRow(['Totales del contexto de filtros; la búsqueda solo limita las filas visibles.']);
    const header = sheet.addRow(heads);
    header.eachCell(cell=>{cell.font={bold:true,color:{argb:'FFFFFFFF'}};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF6352B5'}};});
    sheet.views=[{state:'frozen',ySplit:header.number,xSplit:1}];
    sheet.autoFilter={from:{row:header.number,column:1},to:{row:header.number,column:heads.length}};
    for (const brand of data.brands) {
      const rows = [brand,...brand.skus];
      for (const item of rows) {
        const row = sheet.addRow(['marca' in item ? item.marca : item.sku,brand.unidad_negocio,brand.franquicia,
          item.vta_act,item.vta_mdo,item.ms_act,item.ms_ant,item.ms_territorio,item.ms_ideal,item.estimacion,
          ...clients.flatMap(c=>{const flags = 'clients' in item ? item.clients[c.cp_cliente] : undefined;return [flags?.compra || 'NO', flags?.quintil || c.quintil];}),
          ...distributors.map(d=>'distribuidoras' in item ? item.distribuidoras?.[d] || 0 : 0)]);
        row.outlineLevel = 'marca' in item ? 0 : 1;
        if ('marca' in item) row.font={bold:true};
      }
    }
    const t=data.totals;
    sheet.addRow(['Total general','','',t.vta_act,t.vta_mdo,t.ms_act,t.ms_ant,t.ms_territorio,t.ms_ideal,t.estimacion,
      ...clients.flatMap(()=>['','']),...distributors.map(d=>'distribuidoras' in t ? t.distribuidoras?.[d] || 0 : 0)]).font={bold:true};
    sheet.columns.forEach((col,i)=>{col.width=i===0?52:i<3?22:18;if(i>=3)col.numFmt=i>=5&&i<=8?'0.0%':'#,##0.00';});
    return Buffer.from(await book.xlsx.writeBuffer());
  });
}
