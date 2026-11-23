import { useEffect, useRef, type ReactNode } from "react";
import type { FigureStageProps } from "../topics/types";
import type { Sim, ServerId } from "../sim/model";

/** Both readings share positions, paths and the existing simulation. Only the object artwork changes. */
const IDS: ServerId[] = ["A", "B", "C"];
const POS = { A: [620, 105], B: [675, 280], C: [620, 455] } as const;
type Point = readonly [number, number];
const START: Point = [170, 240];
const GATE: Point = [320, 240];
const OUT: Point = [390, 240];
const CHECK: Point = [335, 490];
const endOf = (id: ServerId): Point => [POS[id][0] - 46, POS[id][1] + 12];
const controlOf = (id: ServerId): Point => [490, POS[id][1] + 12];
const curve = (a: Point, b: Point, c: Point, t: number): Point => [(1-t)**2*a[0]+2*(1-t)*t*b[0]+t*t*c[0], (1-t)**2*a[1]+2*(1-t)*t*b[1]+t*t*c[1]];
const route = (id: ServerId) => `M${OUT.join(',')} Q${controlOf(id).join(',')} ${endOf(id).join(',')}`;
const probeControl = (): Point => [490, 500];
const cap = (n: number) => Math.max(0, Math.min(1, n));

function Base() {
  return <g className="dual-base"><path d="M-72 8 L-72 21 Q-72 28 -62 33 L-9 60 Q0 65 9 60 L62 33 Q72 28 72 21 L72 8Z" className="dual-base-side"/><path d="M-65 0 L-9 -28 Q0 -33 9 -28 L65 0 Q78 7 65 15 L9 44 Q0 49 -9 44 L-65 15 Q-78 7 -65 0Z" className="dual-base-top"/></g>;
}
function Person({ x=0, y=0, small=false }: {x?:number; y?:number; small?:boolean}) {
  return <g transform={`translate(${x},${y}) scale(${small ? .65 : 1})`} className="dual-person"><path d="M-13 4 Q-15 -20 0 -22 Q15 -20 13 4 L8 10 L6 29 M-8 10 L-6 29 M-9 -12 L-20 4 M9 -12 L20 4" fill="none"/><circle cx="0" cy="-34" r="10" className="dual-skin"/><path d="M-11 -2 L11 -2 L9 13 L-9 13Z" className="dual-shirt"/></g>;
}
function Laptop() {
  return <g className="dual-computer"><path d="M-41 -67 L12 -95 Q18 -98 18 -90 L18 -30 L-41 1Z" className="dual-frame"/><path d="M-34 -63 L11 -86 L11 -35 L-34 -11Z" className="dual-screen"/><path d="M-41 1 L18 -30 L55 -9 Q61 -5 54 0 L0 29 Q-4 31 -10 28Z" className="dual-metal"/><path d="M-28 2 L16 -21 L40 -8 L-4 15Z" className="dual-keys"/><path d="M-27 -48 L3 -63 M-27 -37 L-1 -50" className="dual-screen-line"/><circle cx="1" cy="-76" r="2" className="dual-led"/></g>;
}
function Server() {
  return <g><path d="M-39 -77 L-3 -96 L37 -75 L37 -2 L0 18 L-39 -3Z" className="dual-server-side"/><path d="M-39 -77 L0 -56 L37 -75 L-3 -96Z" className="dual-server-top"/><path d="M-39 -77 L0 -56 L0 18 L-39 -3Z" className="dual-server-front"/>{[-60,-40,-20].map(y=><g key={y}><path d={`M-32 ${y} l25 13 v11 l-25 -13Z`} className="dual-drive"/><circle cx="-26" cy={y+9} r="2" className="dual-led"/></g>)}</g>;
}
function Booth({id}:{id:ServerId}) {
  return <g><path d="M-42 -72 L30 -72 L42 -58 L-30 -58Z" className="dual-awning"/><path d="M-42 -72 L-30 -58 V-49 L-42 -61Z" className="dual-awning-side"/>{[-27,-7,13].map(x=><path key={x} d={`M${x} -72 l12 14 h10 l-12 -14Z`} className="dual-awning-stripe"/>)}<path d="M-36 -59 V-9 M35 -57 V-8" className="dual-booth-post"/><Person x={0} y={-14} small/><path d="M-45 -14 L-9 -34 L43 -7 L6 13Z" className="dual-counter-top"/><path d="M-45 -14 L6 13 V33 L-45 6Z" className="dual-counter-front"/><path d="M6 13 L43 -7 V14 L6 33Z" className="dual-counter-side"/><text x="-20" y="10" className="dual-counter-letter">{id}</text></g>;
}
function Label({y=79,children}:{y?:number;children:ReactNode}) {
  return <text x="0" y={y} textAnchor="middle" className="dual-node-label">{children}</text>;
}

export default function DualViewFigure({ runtime, highlight, selected, onPart, representation="analogy" }: FigureStageProps) {
  const svg=useRef<SVGSVGElement>(null);
  const analogy=representation==="analogy";
  const activate=(part:string)=>onPart(selected===part ? null : part);
  const interaction=(part:string,label:string)=>({ role:"button", tabIndex:0, "aria-label":label, "aria-pressed":selected===part, onClick:()=>activate(part), onKeyDown:(e:React.KeyboardEvent<SVGGElement>)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();activate(part);}}, "data-focus":selected===part||highlight.includes(part)||undefined });

  useEffect(()=>{
    const el=svg.current!;
    const tokens=Array.from(el.querySelectorAll<SVGGElement>('[data-request]'));
    const probes=Array.from(el.querySelectorAll<SVGCircleElement>('[data-probe]'));
    return runtime.addDrawer((raw,_dt,{reduced})=>{
      const sim=raw as Sim;
      el.dataset.time=sim.t.toFixed(3);
      let i=0;
      for(const req of sim.requests){
        let pt:Point;
        let alpha=1;
        if(!req.decided){ const t=reduced ? .8 : cap((sim.t-req.createdAt)/sim.params.toLb); pt=[START[0]+(GATE[0]-START[0])*t,START[1]]; }
        else if(req.target && req.outcome!=="rejected"){
          const age=sim.t-(req.resolvedAt??sim.t);
          if(req.outcome==="ok" && age>.6) continue;
          if(req.outcome==="fail" && age>2) continue;
          const t=reduced ? .85 : cap((sim.t-req.decideAt)/sim.params.toServer);
          pt=curve(OUT,controlOf(req.target),endOf(req.target),req.outcome==="fail"?.88:t);
          if(req.outcome==="ok") alpha=1-age/.6;
          if(req.outcome==="fail") alpha=Math.min(1,2-age);
        } else continue;
        const token=tokens[i++]; if(!token) break;
        token.style.display="";
        token.setAttribute('transform',`translate(${pt[0]},${pt[1]})`);
        token.style.opacity=String(Math.max(0,alpha));
        token.dataset.failed=String(req.outcome==="fail");
        token.dataset.id=String(req.id);
      }
      for(;i<tokens.length;i++) tokens[i].style.display="none";
      let p=0;
      if(!reduced) for(const probe of sim.probes){
        const age=sim.t-probe.sentAt;
        const duration=sim.params.probeTravel;
        if(age<0||age>duration*2||(!probe.serverUp && age>duration)) continue;
        const t=age<=duration ? age/duration : 2-age/duration;
        const point=curve(CHECK,probeControl(),endOf(probe.server),t);
        const dot=probes[p++];if(!dot)break;
        dot.style.display="";dot.setAttribute('cx',String(point[0]));dot.setAttribute('cy',String(point[1]));
      }
      for(;p<probes.length;p++)probes[p].style.display="none";
      for(const id of IDS){
        const node=el.querySelector<SVGGElement>(`[data-server='${id}']`)!;
        const state=sim.servers[id];node.dataset.up=String(state.up);node.dataset.healthy=String(state.healthy);
        node.querySelector('[data-health-text]')!.textContent=state.healthy?'Masih mendapat giliran':'Dilewati pembagi';
        node.querySelector('[data-power-text]')!.textContent=state.up?'Aktif':'Berhenti';
        node.querySelector('[data-count]')!.textContent=String(state.sent);
      }
    });
  },[runtime]);

  return <div className="figure-host dual-host" data-view={representation}>
    <svg ref={svg} viewBox="0 0 800 600" className="dual-scene" role="group" aria-label={analogy?'Analogi pengunjung diarahkan petugas ke tiga loket':'Sistem pengguna mengirim permintaan melalui load balancer ke tiga server'}>
      <desc>Kedua tampilan memakai posisi dan simulasi yang sama. Pengunjung mewakili pengguna, petugas mewakili load balancer, dan loket A, B, C mewakili server. Keadaan aktif berbeda dari keputusan pembagi untuk memberi giliran.</desc>
      <g className="dual-connections" aria-hidden="true"><path d={`M${START} H${GATE[0]}`}/>{IDS.map(id=><path key={id} d={route(id)}/>)}{IDS.map(id=><path key={`probe${id}`} className="dual-check-route" d={`M${CHECK} Q${probeControl()} ${endOf(id)}`}/>)}</g>
      <g transform="translate(115,240)" {...interaction('client',analogy?'Pengunjung, mewakili pengguna':'Pengguna, seperti pengunjung')}><Base/><g style={{display:analogy?undefined:'none'}}><Person x={-16} y={-24}/><Person x={24} y={-7} small/></g><g style={{display:analogy?'none':undefined}}><Laptop/></g><Label>{analogy?'Pengunjung':'Pengguna'}</Label><text y="99" textAnchor="middle" className="dual-pair-label">{analogy?'Pengguna / klien':'Seperti pengunjung'}</text></g>
      <g transform="translate(340,240)" {...interaction('lb',analogy?'Petugas pembagi, mewakili load balancer':'Load balancer, seperti petugas pembagi')}><Base/><g style={{display:analogy?undefined:'none'}}><Person x={0} y={-26}/><path d="M-45 -10 L0 -34 L45 -10 L0 14Z" className="dual-gateway-top"/><path d="M-45 -10 L0 14 V38 L-45 14Z" className="dual-gateway-front"/><path d="M0 14 L45 -10 V14 L0 38Z" className="dual-gateway-side"/></g><g style={{display:analogy?'none':undefined}}><Server/></g><Label>{analogy?'Petugas pembagi':'Load balancer'}</Label><text y="99" textAnchor="middle" className="dual-pair-label">{analogy?'Load balancer':'Seperti petugas pembagi'}</text></g>
      {IDS.map(id=><g key={id} transform={`translate(${POS[id]})`} data-server={id} {...interaction(`server${id}`,`${analogy?'Loket':'Server'} ${id}`)}><Base/><g className="dual-node-art" transform="scale(.75)"><g style={{display:analogy?undefined:'none'}}><Booth id={id}/></g><g style={{display:analogy?'none':undefined}}><Server/></g></g><g className="dual-down-mark" aria-hidden="true"><circle cx="0" cy="-34" r="20"/><path d="M-7 -41 L7 -27 M7 -41 L-7 -27"/></g><g className="dual-count"><rect x="35" y="-75" width="34" height="24" rx="7"/><text x="52" y="-58" textAnchor="middle" data-count>0</text></g><Label y={78}>{analogy?'Loket':'Server'} {id}<tspan className="dual-power" dx="8" data-power-text>Aktif</tspan></Label><text y="98" textAnchor="middle" className="dual-health" data-health-text>Masih mendapat giliran</text></g>)}
      <g transform="translate(335,490)" {...interaction('hc',analogy?'Petugas pemeriksa, mewakili health check':'Health check, seperti petugas pemeriksa')}><rect x="-57" y="-23" width="114" height="44" rx="12" className="dual-check-box"/><path d="M-41 -3 l7 7 12 -15" className="dual-check-icon"/><text x="15" y="3" textAnchor="middle" className="dual-small-label">{analogy?'Pemeriksa':'Health check'}</text><text y="43" textAnchor="middle" className="dual-pair-label">{analogy?'Pemeriksaan berkala':'Seperti petugas pemeriksa'}</text></g>
      <g aria-hidden="true">{Array.from({length:24},(_,i)=><g key={i} data-request style={{display:'none'}} className="dual-request"><rect x="-8" y="-7" width="16" height="14" rx="4"/><path d="M-4 -3 L4 3 M4 -3 L-4 3"/></g>)}{Array.from({length:12},(_,i)=><circle key={i} data-probe r="4" className="dual-probe" style={{display:'none'}}/>)}</g>
      <text x="28" y="580" className="dual-diagram-note">{analogy?'Satu pengunjung = satu permintaan. Angka di loket = jumlah yang diarahkan.':'Satu token = satu request. Angka di server = jumlah request yang diteruskan.'}</text>
    </svg>
  </div>;
}
