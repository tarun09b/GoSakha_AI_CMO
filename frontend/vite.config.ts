import vinext from 'vinext';
import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import {sites} from './build/sites-vite-plugin';

const projectRoot=fileURLToPath(new URL('../',import.meta.url));
const statePath=fileURLToPath(new URL('../.local/state',import.meta.url));

export default defineConfig(async()=>{
 process.env.CLOUDFLARE_CF_FETCH_ENABLED ??= 'false';
 process.env.WRANGLER_SEND_METRICS ??= 'false';
 process.env.WRANGLER_WRITE_LOGS ??= 'false';
 const {cloudflare}=await import('@cloudflare/vite-plugin');
 return {
  resolve:{alias:{'@':projectRoot}},
  server:{host:'127.0.0.1',fs:{allow:[projectRoot]}},
  plugins:[vinext(),sites({mockAuth:true}),cloudflare({
   viteEnvironment:{name:'rsc',childEnvironments:['ssr']},
   inspectorPort:false,
   persistState:{path:statePath},
   config:{
    name:'gosakha-cmo-ai',
    main:'vinext/server/fetch-handler',
    compatibility_date:'2026-05-15',
    compatibility_flags:['nodejs_compat'],
    d1_databases:[{binding:'DB',database_name:'gosakha-cmo-local',database_id:'00000000-0000-4000-8000-000000000000'}],
   },
  })],
 };
});
