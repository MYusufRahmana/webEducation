/** Export the current system scenes as self-contained SVG thumbnails for the catalogue and fallback. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
const root='http://127.0.0.1:5173/';
mkdirSync('public/previews',{recursive:true});
mkdirSync('shots/reference-review',{recursive:true});
const capture=`(()=>{const original=document.querySelector('.sys-svg');const clone=original.cloneNode(true);const originals=[original,...original.querySelectorAll('*')];const copies=[clone,...clone.querySelectorAll('*')];const properties=['fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','stroke-dasharray','opacity','font-family','font-size','font-weight','text-anchor','display'];for(let i=0;i<originals.length;i++){const cs=getComputedStyle(originals[i]);for(const key of properties)copies[i].style.setProperty(key,cs.getPropertyValue(key));}clone.setAttribute('xmlns','http://www.w3.org/2000/svg');clone.setAttribute('width','1000');clone.setAttribute('height','650');clone.style.width='1000px';clone.style.height='650px';return new XMLSerializer().serializeToString(clone)})()`;
for(const slug of ['load-balancer','dns','message-queue'].filter(s=>process.argv.length<3||process.argv.slice(2).includes(s)))for(const theme of ['light','dark']){
 const step=slug==='load-balancer'?'bergiliran':slug==='dns'?'authoritative':'tambah-consumer';
 const path='shots/reference-review/export.json';
 const setup=`(()=>{localStorage.setItem('webedukasi.view','system');const t=document.querySelector('select[aria-label="Tema"]');t.value='${theme}';t.dispatchEvent(new Event('change',{bubbles:true}));})()`;
 writeFileSync(path,JSON.stringify([['wait',1100],['eval',setup],['wait',400],['eval',capture]]));
 const result=execFileSync(process.execPath,['scripts/drive-viewport.mjs',`${root}?topik=${slug}&langkah=${step}`,'--actions',path,'--width','1440','--height','900'],{encoding:'utf8',timeout:60000,maxBuffer:8*1024*1024});
 const line=result.split('\n').find(line=>line.startsWith('eval: "<svg'));
 if(!line)throw Error(`No SVG captured for ${slug}: ${result.slice(-500)}`);
 writeFileSync(`public/previews/${slug}-${theme}.svg`,JSON.parse(line.slice(6)));
 console.log(`Preview exported: ${slug} ${theme}`);
}
for(const [file,slug]of [['src/topics/load-balancer/index.tsx','load-balancer'],['src/topics/dns/index.tsx','dns'],['src/topics/message-queue/index.tsx','message-queue']]){
 const source=readFileSync(file,'utf8');
 writeFileSync(file,source.replace(/fallbackImage: \(theme\) => `[^`]+`/,`fallbackImage: (theme) => \`\${import.meta.env.BASE_URL}previews/${slug}-\${theme}.svg\``));
}
