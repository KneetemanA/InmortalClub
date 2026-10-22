import test from 'node:test';
import assert from 'node:assert/strict';
import { readApiResponse } from '../src/api-response.ts';

test('429 en texto o JSON muestra el límite y Retry-After', async () => {
  await assert.rejects(readApiResponse(new Response('Too many requests, please try again later.', { status: 429, headers: { 'Retry-After': '12' } })), /límite de solicitudes.*12 segundos/);
  await assert.rejects(readApiResponse(new Response(JSON.stringify({success:false,message:'Demasiados intentos de acceso fallidos.'}),{status:429})), /intentos de acceso fallidos/);
});
test('503 HTML durante un cambio advierte que debe verificarse antes de repetirlo', async () => {
  await assert.rejects(readApiResponse(new Response('<html>Service unavailable</html>',{status:503}),'POST'), /HTTP 503.*No se pudo confirmar si el cambio se guardó/);
  await assert.rejects(readApiResponse(new Response('Unavailable',{status:502})), error => /HTTP 502/.test(error.message) && !/cambio se guardó/.test(error.message));
});
test('rechaza HTML con 200 y conserva respuestas JSON de autorización y validación', async () => {
  await assert.rejects(readApiResponse(new Response('<html>Login</html>')),/respuesta inesperada/);
  const invalid = {success:false,message:'Token inválido'};
  assert.deepEqual(await readApiResponse(new Response(JSON.stringify(invalid),{status:401})),invalid);
  const valid={success:true,data:{id:'member'}};
  assert.deepEqual(await readApiResponse(new Response(JSON.stringify(valid))),valid);
});
