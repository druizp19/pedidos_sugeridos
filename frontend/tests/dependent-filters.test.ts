import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dependentOptions, reconcileFilters } from '../domain/dependent-filters';
import { initialFilters, updateFilter } from '../domain/report-filters';
import type { FilterData } from '../domain/report-contracts';
const data: FilterData = {
 versions:[],units:[],periodo:'',clients:[],quintiles:[],
 unidades_negocio:['FARMA','CONSUMO'],franquicias:['F','C'],marcas:['A','B'],
 categorizaciones:['ORO','DIAMANTE'],zonas_base:['A021','CD03','LIMA'],
 supervisores:['Comercial','CADENAS','SUPERVISOR MKT'],vendedores:['Uno','Dos','CADENAS','Marketing'],
 relations:{ materials:[['FARMA','F','A'],['CONSUMO','C','B']], clients:[
  ['ORO','A021','Comercial','Uno'],['ORO','A021','Comercial','Dos'],
  ['DIAMANTE','CD03','CADENAS','CADENAS'],['ORO','LIMA','SUPERVISOR MKT','Marketing'],
  ['SIN CATEGORIZACION','LIMA','SUPERVISOR MKT','Marketing'],
 ]},
};
test('product facets work both ways and ignore their own selection',()=>{
 const byUnit=dependentOptions(data,{...initialFilters,unidadNegocio:'FARMA'});
 assert.deepEqual(byUnit.marcas,['A']); assert.deepEqual(byUnit.franquicias,['F']);
 assert.deepEqual(byUnit.unidades_negocio,['CONSUMO','FARMA']);
 const byBrand=dependentOptions(data,{...initialFilters,marca:'B'});
 assert.deepEqual(byBrand.unidades_negocio,['CONSUMO']); assert.deepEqual(byBrand.franquicias,['C']);
});
test('commercial facets preserve multiple sellers, chains and Marketing',()=>{
 const zone=dependentOptions(data,{...initialFilters,zonaBase:'A021'});
 assert.deepEqual(zone.vendedores,['Dos','Uno']); assert.deepEqual(zone.supervisores,['Comercial']);
 assert.deepEqual(zone.categorizaciones,['ORO']);
 const chains=dependentOptions(data,{...initialFilters,vendedor:'CADENAS'});
 assert.deepEqual(chains.zonas_base,['CD03']); assert.deepEqual(chains.supervisores,['CADENAS']);
 const mkt=dependentOptions(data,{...initialFilters,supervisor:'SUPERVISOR MKT'});
 assert.deepEqual(mkt.vendedores,['Marketing']); assert.deepEqual(mkt.categorizaciones,['ORO']);
 assert.equal(mkt.categorizaciones.includes('SIN CATEGORIZACION'),false);
});
test('commercial filters do not hide unsold product opportunities',()=>{
 const result=dependentOptions(data,{...initialFilters,vendedor:'CADENAS',marca:'B'});
 assert.deepEqual(result.marcas,['A','B']); assert.deepEqual(result.zonas_base,['CD03']);
});
test('new selection wins, clears incompatible siblings atomically and preserves unrelated state',()=>{
 const old={...initialFilters,unidadNegocio:'FARMA',franquicia:'F',marca:'A',vendedor:'Uno',selectedClients:['001']};
 const next=reconcileFilters(data,updateFilter(old,'unidadNegocio','CONSUMO'),'unidadNegocio');
 assert.equal(next.unidadNegocio,'CONSUMO'); assert.equal(next.franquicia,''); assert.equal(next.marca,'');
 assert.equal(next.vendedor,'Uno'); assert.deepEqual(next.selectedClients,['001']); assert.equal(old.marca,'A');
 const commercial=reconcileFilters(data,updateFilter({...old,zonaBase:'A021',supervisor:'Comercial'},'vendedor','CADENAS'),'vendedor');
 assert.equal(commercial.vendedor,'CADENAS');assert.equal(commercial.zonaBase,'');assert.equal(commercial.supervisor,'');
 assert.deepEqual(commercial.selectedClients,[]);
});
test('clearing a filter retains compatible selections and no results do not become all results',()=>{
 const state={...initialFilters,unidadNegocio:'FARMA',franquicia:'F',marca:'A'};
 const next=reconcileFilters(data,updateFilter(state,'marca',''),'marca');
 assert.equal(next.franquicia,'F');assert.equal(next.unidadNegocio,'FARMA');
 assert.deepEqual(dependentOptions(data,{...initialFilters,zonaBase:'missing'}).vendedores,[]);
 assert.deepEqual(dependentOptions({...data,relations:{materials:[],clients:[]}},initialFilters).marcas,[]);
});
