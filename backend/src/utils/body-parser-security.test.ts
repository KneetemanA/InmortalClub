import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { gzipSync } from 'node:zlib';

test('body-parser: acepta JSON comprimido y sigue respondiendo tras datos comprimidos inválidos', async t => {
  const app=express();
  app.use(express.json());
  app.post('/probe',(req,res)=>{res.json({received:req.body});});
  app.get('/health',(_req,res)=>{res.json({ok:true});});
  app.use((_error:Error,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{res.status(400).json({success:false});});
  const server=app.listen(0,'127.0.0.1');
  await new Promise<void>(resolve=>server.once('listening',resolve));
  t.after(()=>new Promise<void>((resolve,reject)=>{server.closeAllConnections();server.close(error=>error?reject(error):resolve());}));
  const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
  const frame=gzipSync(Buffer.from(JSON.stringify({value:'prueba local'})));
  const send=(body:Buffer)=>fetch(`${base}/probe`,{method:'POST',headers:{'Content-Type':'application/json','Content-Encoding':'gzip'},body:new Uint8Array(body)});
  const valid=await send(frame);assert.equal(valid.status,200);assert.deepEqual(await valid.json(),{received:{value:'prueba local'}});
  const malformed=await send(Buffer.concat([frame,Buffer.from('trailing-invalid-data')]));
  assert.ok([200,400].includes(malformed.status));await malformed.text();
  await new Promise<void>(resolve=>setImmediate(resolve));
  const health=await fetch(`${base}/health`);assert.equal(health.status,200);assert.deepEqual(await health.json(),{ok:true});
});
