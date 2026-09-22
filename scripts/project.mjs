import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {copyFileSync,existsSync,mkdirSync,readdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const frontend=path.join(root,'frontend');
const [command,...extra]=process.argv.slice(2);
const [major,minor]=process.versions.node.split('.').map(Number);
if(major<22||(major===22&&minor<18))throw new Error('Install Node.js 22.18 or newer (Node 24 recommended).');
process.chdir(root);
process.env.CLOUDFLARE_CF_FETCH_ENABLED ??= 'false';
process.env.WRANGLER_SEND_METRICS ??= 'false';
process.env.WRANGLER_WRITE_LOGS ??= 'false';
process.env.WRANGLER_LOG_PATH ??= path.join(root,'.local/logs');
process.env.WRANGLER_REGISTRY_PATH ??= path.join(root,'.local/registry');
process.env.MINIFLARE_REGISTRY_PATH ??= path.join(root,'.local/miniflare-registry');

function run(entry,args,cwd=root){
 const result=spawnSync(process.execPath,[entry,...args],{cwd,stdio:'inherit',env:process.env,shell:false});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status??1);
}
function wrangler(args,cwd=root){run(path.join(root,'node_modules/wrangler/bin/wrangler.js'),args,cwd)}
function migrate(){wrangler(['d1','migrations','apply','DB','--local','--config',path.join(root,'backend/wrangler.json'),'--persist-to',path.join(root,'.local/state')])}
function configure(){
 mkdirSync(path.join(root,'.local'),{recursive:true});
 const vars=path.join(frontend,'.dev.vars');
 if(!existsSync(vars))copyFileSync(path.join(root,'backend/.env.example'),vars);
}

if(command==='setup'){
 configure();migrate();writeFileSync(path.join(root,'.local/initialized'),'Local migrations applied.\n');
 console.log('Ready. Run pnpm dev, then open http://localhost:5173.');
}else if(command==='db:migrate'){
 configure();migrate();
}else if(command==='db:generate'){
 run(path.join(root,'node_modules/drizzle-kit/bin.cjs'),['generate','--config=backend/drizzle.config.ts',...extra]);
}else if(command==='typecheck'){
 run(path.join(root,'node_modules/typescript/bin/tsc'),['--noEmit',...extra]);
}else if(command==='test'){
 const files=readdirSync(path.join(root,'tests')).filter(f=>f.endsWith('.test.mjs')).map(f=>path.join(root,'tests',f));
 run(path.join(root,'scripts/test-runner.mjs'),[...extra,...files]);
}else if(command==='dev'||command==='build'){
 configure();
 if(command==='dev'&&!existsSync(path.join(root,'.local/initialized'))){migrate();writeFileSync(path.join(root,'.local/initialized'),'Local migrations applied.\n')}
 process.chdir(frontend);
 const cli=path.join(root,'node_modules/vinext/dist/cli.js');
 process.argv=[process.execPath,cli,command,...(command==='dev'?['--port','5173','--hostname','127.0.0.1']:[]),...extra];
 await import(pathToFileURL(cli).href);
}else if(command==='start'){
 const config=path.join(frontend,'dist/server/wrangler.json');
 if(!existsSync(config))throw new Error('Run pnpm build before pnpm start.');
 wrangler(['dev','--config',config,'--local','--persist-to',path.join(root,'.local/state'),'--ip','127.0.0.1','--port','8787','--inspector-port','0',...extra],frontend);
}else{
 throw new Error('Use setup, dev, build, start, test, typecheck, db:migrate or db:generate.');
}
