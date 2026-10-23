import test from 'node:test';
import assert from 'node:assert/strict';
import mariadb from 'mariadb';
import { databaseErrorDetails } from './database-diagnostic';
import { diagnoseDatabaseConnection } from '../config/database';

test('diagnóstico: informa código MySQL sin copiar mensajes ni credenciales', () => {
  const details=databaseErrorDetails({code:'ER_ACCESS_DENIED_ERROR',errno:1045,sqlState:'28000',message:'contraseña-confidencial',sql:'mysql://usuario:secreto@servidor/base'});
  assert.equal(details.code,'ER_ACCESS_DENIED_ERROR');assert.equal(details.errno,1045);
  assert.match(details.reason,/autenticación/);assert.doesNotMatch(JSON.stringify(details),/confidencial|secreto|mysql:\/\//);
  assert.equal(databaseErrorDetails({code:'mysql://con-secreto',sqlState:'password'}).code,'UNKNOWN');
});
test('diagnóstico: conexión directa solo verifica SELECT 1 y cierra', async t => {
  const queries:string[]=[];let closed=false;
  t.mock.method(console,'info',()=>{});
  t.mock.method(mariadb,'createConnection',async()=>({query:async(sql:string)=>queries.push(sql),end:async()=>{closed=true}}));
  assert.equal(await diagnoseDatabaseConnection(),true);assert.deepEqual(queries,['SELECT 1']);assert.equal(closed,true);
});
test('diagnóstico: registra la causa de autenticación que ocultaba el pool', async t => {
  const logs:any[]=[];t.mock.method(console,'error',(...args:any[])=>{logs.push(args)});
  t.mock.method(mariadb,'createConnection',async()=>{throw {code:'ER_ACCESS_DENIED_ERROR',errno:1045,sqlState:'28000',message:'SECRETO_QUE_NO_SE_IMPRIME'}});
  assert.equal(await diagnoseDatabaseConnection(),false);assert.equal(logs[0][0],'[MYSQL_ERROR_CONEXION]');assert.equal(logs[0][1].errno,1045);assert.doesNotMatch(JSON.stringify(logs),/SECRETO_QUE_NO_SE_IMPRIME/);
});
