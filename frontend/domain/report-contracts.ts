export interface ClientOption {
  ruc: string;
  farmacia: string;
  cp_cliente: string;
  categorizacion: string;
  quintil: string;
  lima_provincias?: string;
  zonabase?: string;
  zona_cliente?: string;
  supervisor?: string;
  vendedores?: string[];
}

export interface ClientSearchResult {
  items: ClientOption[];
  total: number;
  limit: number;
}

export interface FilterRelations {
  materials: [unit: string, franchise: string, brand: string][];
  clients: [category: string, zone: string, supervisor: string, seller: string][];
}

export interface FilterData {
  relations?: FilterRelations;
  versions: { id: string; label: string; months: number; enabled: boolean; publishedAt?: string | null }[];
  publicado_en?: string | null;
  vendedores: string[];
  unidades_negocio: string[];
  franquicias: string[];
  marcas: string[];
  categorizaciones: string[];
  quintiles: string[];
  supervisores: string[];
  zonas_base: string[];
  clients: ClientOption[];
  units: string[];
  periodo: string;
}

export interface ClientMatrixValue {
  compra: "SI" | "NO";
  quintil: string;
}

export interface MatrixSKU {
  sku: string;
  vta_act: number;
  vta_mdo: number;
  ms_act: number;
  ms_ant: number;
  ms_territorio: number;
  ms_ideal: number;
  estimacion: number;
  clients: Record<string, ClientMatrixValue>;
}

export interface MatrixBrand {
  marca: string;
  unidad_negocio: string;
  franquicia: string;
  vta_act: number;
  vta_mdo: number;
  ms_act: number;
  ms_ant: number;
  ms_territorio: number;
  ms_ideal: number;
  estimacion: number;
  clients: Record<string, ClientMatrixValue>;
  skus: MatrixSKU[];
}

export interface MatrixTotals {
  marca: string;
  vta_act: number;
  vta_mdo: number;
  ms_act: number;
  ms_ant: number;
  ms_territorio: number;
  ms_ideal: number;
  estimacion: number;
}

export interface ClientColumn {
  cp_cliente: string;
  ruc: string;
  farmacia: string;
  quintil: string;
  categorizacion: string;
  lima_provincias?: string;
  zonabase?: string;
  zona_cliente?: string;
  supervisor?: string;
  vendedores?: string[];
}

export interface MatrixResponse {
  publicado_en?: string | null;
  venta_actual_mensual_global?: number;
  unidad_medida: string;
  periodo: string;
  client_columns: ClientColumn[];
  brands: MatrixBrand[];
  totals: MatrixTotals;
  total_brands_count: number;
  total_clients_count: number;
}

export interface FilterState {
  version: string;
  vendedor: string;
  unidadMedida: "UNIDAD" | "S/ SOLES";
  unidadNegocio: string;
  franquicia: string;
  marca: string;
  quintil: string;
  zonaBase: string;
  supervisor: string;
  search: string;
  selectedClients: string[];
}

export interface ClientInfo {
  ruc: string;
  farmacia: string;
  cp_cliente: string;
  lima_provincias?: string;
  categorizacion: string;
  quintil: string;
  zonabase?: string;
  zona_cliente?: string;
  supervisor?: string;
  vendedores?: string[];
}

export interface ClientDetailSKU {
  sku: string;
  vta_act: number;
  vta_mdo: number;
  ms_act: number;
  ms_ant: number;
  ms_territorio: number;
  ms_ideal: number;
  estimacion: number;
  distribuidoras?: Record<string, number>;
}

export interface ClientDetailBrand {
  marca: string;
  unidad_negocio: string;
  franquicia: string;
  vta_act: number;
  vta_mdo: number;
  ms_act: number;
  ms_ant: number;
  ms_territorio: number;
  ms_ideal: number;
  estimacion: number;
  distribuidoras?: Record<string, number>;
  skus: ClientDetailSKU[];
}

export interface ClientDetailTotals extends MatrixTotals {
  distribuidoras?: Record<string, number>;
}

export interface ClientMatrixResponse {
  publicado_en?: string | null;
  client: ClientInfo;
  unidad_medida: string;
  periodo: string;
  distributors?: string[];
  brands: ClientDetailBrand[];
  totals: ClientDetailTotals;
  total_brands_count: number;
}
