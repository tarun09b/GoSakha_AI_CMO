import {spawnSync} from 'node:child_process';
const result=spawnSync(process.execPath,['--test',...process.argv.slice(2)],{stdio:'inherit',shell:false});
if(result.error)throw result.error;
process.exit(result.status??1);
