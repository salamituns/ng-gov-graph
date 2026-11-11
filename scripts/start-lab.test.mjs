import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,cp,mkdir,writeFile,rm,readFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {spawn} from 'node:child_process'
import {once} from 'node:events'

test('lab entry clears both mounted directories before loading the server and preserves compiled code',async()=>{
  const app=await mkdtemp(join(tmpdir(),'govgraph-start-'))
  try {
    await cp('scripts/start-lab.mjs',join(app,'start.mjs'))
    for(const relative of ['.next/cache/nested','.next/server/route-cache/nested','.next/server/app']) {
      await mkdir(join(app,relative),{recursive:true});await writeFile(join(app,relative,'entry'),'old')
    }
    await writeFile(join(app,'server.js'),`const fs=require('node:fs');for(const p of ['.next/cache','.next/server/route-cache'])if(fs.readdirSync(p).length)process.exit(2);fs.writeFileSync('started','yes');`)
    for(let i=0;i<2;i++) {
      const child=spawn(process.execPath,['start.mjs'],{cwd:app,stdio:'ignore'})
      assert.equal((await once(child,'exit'))[0],0)
      assert.equal(await readFile(join(app,'started'),'utf8'),'yes')
    }
    assert.equal(await readFile(join(app,'.next/server/app/entry'),'utf8'),'old')
  } finally {await rm(app,{recursive:true,force:true})}
})
