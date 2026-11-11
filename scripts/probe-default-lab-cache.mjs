// Verify why Next 16.4.6's default cache cannot satisfy this read-only mount contract.
import assert from 'node:assert/strict'
import {cp,mkdtemp,readFile,writeFile,rm,readdir,chmod} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {spawn} from 'node:child_process'
import {once} from 'node:events'

process.loadEnvFile('.env.local')
const temp=await mkdtemp(join(tmpdir(),'govgraph-default-'))
let server
async function modes(dir,write) {
  for(const entry of await readdir(dir,{withFileTypes:true})) {
    if(entry.isSymbolicLink()) continue
    const file=join(dir,entry.name)
    if(entry.isDirectory()) await modes(file,write)
    await chmod(file,write?0o755:entry.isDirectory()?0o555:0o444)
  }
  await chmod(dir,write?0o755:0o555)
}
try {
  await cp('.next/standalone',temp,{recursive:true})
  const entry=join(temp,'server.js')
  const serverText=await readFile(entry,'utf8')
  assert(serverText.includes('"cacheHandler":"../cache-handler.cjs",'))
  await writeFile(entry,serverText.replace('"cacheHandler":"../cache-handler.cjs",',''))
  const root=join(temp,'.next/server/app')
  for(const file of await readdir(root,{recursive:true})) {
    if(/^(ng(?:[/.])|api\/graph(?:[/.]))/.test(file)&&/\.(html|rsc|meta|body)$/.test(file)) await rm(join(root,file))
  }
  await modes(temp,false);await modes(join(temp,'.next/cache'),true)
  server=spawn(process.execPath,['server.js'],{cwd:temp,env:{...process.env,PORT:'3136',HOSTNAME:'127.0.0.1'},stdio:['ignore','ignore','pipe']})
  let errors='';server.stderr.on('data',data=>errors+=data)
  for(let i=0;i<100;i++) {try{await fetch('http://127.0.0.1:3136/healthz');break}catch{await new Promise(done=>setTimeout(done,100))}}
  const response=await fetch('http://127.0.0.1:3136/ng');await response.text()
  assert.equal(response.status,200)
  for(let i=0;i<100&&!errors.includes('EACCES');i++) await new Promise(done=>setTimeout(done,20))
  assert.match(errors,/EACCES/)
  assert.match(errors,/\.next\/server\/(?:app\/|route-cache)/)
  console.log('CONFIRMED: deleting demo prerenders allows /ng 200, but default ISR cannot persist under read-only .next/server (EACCES). Keeping only .next/cache writable requires a handler.')
} finally {
  if(server&&server.exitCode===null){server.kill();await once(server,'exit')}
  await modes(temp,true);await rm(temp,{recursive:true,force:true})
}
