import { useEffect, useRef } from "react";
import type { FigureStageProps } from "../../topics/types";
import type { Frame, Visual } from "./iso";

export interface SystemSpec<S> {
  frame: Frame;
  floor: string;
  render: (sim: S, visual: Visual) => string;
  label: string;
  analogyLabel: string;
  /** Extra room the camera leaves around the framed parts, in viewBox units (default 88 × 74). */
  cameraPad?: [number, number];
}

/** Patch attributes in place: live tokens keep their DOM nodes and scene animations can finish. */
function patch(target: Element, source: Element) {
  for (const a of Array.from(target.attributes)) if (!source.hasAttribute(a.name)) target.removeAttribute(a.name);
  for (const a of Array.from(source.attributes)) if (target.getAttribute(a.name) !== a.value) target.setAttribute(a.name, a.value);
  const next=Array.from(source.childNodes);
  for(let i=0;i<next.length;i++){
    const a=target.childNodes[i],b=next[i];
    if(!a){target.appendChild(b.cloneNode(true));continue;}
    if(a.nodeType!==b.nodeType || (a instanceof Element && b instanceof Element && a.tagName!==b.tagName)){a.replaceWith(b.cloneNode(true));continue;}
    if(a instanceof Element && b instanceof Element) patch(a,b);
    else if(a.textContent!==b.textContent) a.textContent=b.textContent;
  }
  while(target.childNodes.length>next.length)target.lastChild!.remove();
}
const ease=(n:number)=>1-(1-n)**3;
/** getBBox excludes the element's own transform; express labels in the live layer's coordinates. */
function bounds(node: SVGGraphicsElement) {
  const b=node.getBBox(),m=node.transform.baseVal.consolidate()?.matrix;
  if(!m)return b;
  const points=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(m));
  const left=Math.min(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y));
  return new DOMRect(left,top,Math.max(...points.map(p=>p.x))-left,Math.max(...points.map(p=>p.y))-top);
}

export function SystemStage<S>({ spec, runtime, highlight, selected, onPart, representation = "system" }: FigureStageProps & { spec: SystemSpec<S> }) {
  const host=useRef<HTMLDivElement>(null);
  const visual=useRef<Visual>({analogy:representation==="analogy",highlight:new Set(highlight),selected,reduced:runtime.reduced,step:runtime.currentStep});
  const redraw=useRef<()=>void>(()=>{});
  const onPartRef=useRef(onPart);onPartRef.current=onPart;
  useEffect(()=>{
    const element=host.current!;
    const initial=spec.frame.viewBox;
    element.innerHTML=`<svg class="sys-svg" viewBox="${initial.join(' ')}" preserveAspectRatio="xMidYMid meet" role="group" aria-label="${spec.label.replace(/"/g,'&quot;')}"><g class="sys-floor">${spec.floor}</g><g class="sys-live"></g></svg>`;
    const svg=element.querySelector('svg')!;
    const live=element.querySelector<SVGGElement>('.sys-live')!;
    const parser=document.createElementNS('http://www.w3.org/2000/svg','svg');
    const nodes=new Map<string,SVGElement>();
    let last:S|null=null;
    let lastStep=-1;
    let lastAnalogy=visual.current.analogy;
    let current=initial.map(Number);
    let from=[...current];
    let to=[...current];
    let cameraAt=0;
    let cameraReady=false;
    const paint=(sim:S)=>{
      last=sim;
      visual.current.step=runtime.currentStep;
      const changed=lastStep!==runtime.currentStep;
      const switching=lastAnalogy!==visual.current.analogy;
      svg.dataset.step=String(runtime.currentStep);
      svg.dataset.time=String((sim as {t?:number}).t??0);
      svg.toggleAttribute('data-focus',visual.current.highlight.size>0||visual.current.selected!==null);
      const previous=new Map<string,DOMRect>();
      if(changed) for(const [key,node] of nodes) if(node.classList.contains('sys-node'))previous.set(key,bounds(node as SVGGraphicsElement));
      parser.innerHTML=spec.render(sim,visual.current);
      const occurrences=new Map<string,number>();
      const retained=new Set<string>();
      const animate:Array<{node:SVGElement;fresh:boolean;key:string}>=[];
      let cursor:ChildNode|null=live.firstChild;
      for(const child of Array.from(parser.children)){
        const base=child.getAttribute('data-key')??`${child.getAttribute('data-part')??''}:${child.getAttribute('class')??child.tagName}:${child.getAttribute('data-kind')??''}`;
        const count=occurrences.get(base)??0;occurrences.set(base,count+1);
        const key=`${base}:${count}`;retained.add(key);
        let node=nodes.get(key);
        const fresh=!node;
        if(!node){node=child.cloneNode(true) as SVGElement;nodes.set(key,node);}
        else patch(node,child);
        if(node!==cursor)live.insertBefore(node,cursor);
        cursor=node.nextSibling;
        if((changed||switching)&&(node.classList.contains('sys-node')||node.classList.contains('sys-pill')||node.classList.contains('sys-edge')))animate.push({node,fresh,key});
      }
      for(const [key,node] of nodes)if(!retained.has(key)){node.getAnimations().forEach(a=>a.cancel());node.remove();nodes.delete(key);}
      if(changed||switching){
        const targets=Array.from(live.querySelectorAll<SVGGraphicsElement>(':scope > .sys-node, :scope > .sys-pill, :scope > .sys-zone'));
        if(changed&&targets.length){
          const boxes=targets.map(n=>bounds(n)).filter(b=>b.width>0&&b.height>0);
          if(boxes.length){
            const left=Math.min(...boxes.map(b=>b.x)),top=Math.min(...boxes.map(b=>b.y));
            const right=Math.max(...boxes.map(b=>b.x+b.width)),bottom=Math.max(...boxes.map(b=>b.y+b.height));
            // Reserve generous room for status pills; avoid a huge zoom on the first object.
            const [padW,padH]=spec.cameraPad??[88,74];const width=Math.max(260,right-left+padW),height=Math.max(210,bottom-top+padH);
            from=[...current];to=[(left+right-width)/2,(top+bottom-height)/2,width,height];cameraAt=performance.now();
            if(!cameraReady||visual.current.reduced){current=[...to];from=[...to];}cameraReady=true;
          }
        }
        if(!visual.current.reduced)for(const {node,fresh,key}of animate){
          node.getAnimations().forEach(a=>a.cancel());
          const before=previous.get(key),after=bounds(node as SVGGraphicsElement);
          const dx=before?before.x-after.x:0,dy=before?before.y-after.y:16;
          if(node.classList.contains('sys-node'))node.animate([{opacity:fresh?0:.6,transform:`translate(${dx}px,${dy}px)`},{opacity:1,transform:'translate(0,0)'}],{duration:620,easing:'cubic-bezier(.2,.7,.2,1)'});
          else if(fresh)node.animate([{opacity:0},{opacity:1}],{duration:550,delay:80});
          if(fresh&&node.classList.contains('sys-edge'))for(const path of Array.from(node.querySelectorAll<SVGPathElement>('path:not(.sys-hit)'))){const length=path.getTotalLength();if(length)path.animate([{strokeDasharray:`${length}`,strokeDashoffset:length},{strokeDasharray:`${length}`,strokeDashoffset:0}],{duration:650,easing:'ease-out'});}
        }
        lastStep=runtime.currentStep;lastAnalogy=visual.current.analogy;
      }
      const k=visual.current.reduced?1:ease(Math.min(1,(performance.now()-cameraAt)/720));
      current=from.map((value,i)=>value+(to[i]-value)*k);
      svg.setAttribute('viewBox',current.map(n=>n.toFixed(2)).join(' '));
      svg.dataset.transitioning=String(k<1);
    };
    redraw.current=()=>{if(last)paint(last);};
    const detach=runtime.addDrawer((sim,_dt,info)=>{visual.current.reduced=info.reduced;paint(sim as unknown as S);});
    const click=(event:MouseEvent)=>{const part=(event.target as Element).closest<SVGElement>('[data-part]')?.dataset.part;if(part)onPartRef.current(part);};
    element.addEventListener('click',click);
    return()=>{element.removeEventListener('click',click);detach();for(const node of nodes.values())node.getAnimations().forEach(a=>a.cancel());element.innerHTML='';};
  },[runtime,spec]);
  useEffect(()=>{
    visual.current={...visual.current,analogy:representation==='analogy',highlight:new Set(highlight),selected};
    redraw.current();
    host.current?.querySelector('svg')?.setAttribute('aria-label',representation==='analogy'?spec.analogyLabel:spec.label);
  },[highlight,selected,representation,spec]);
  return <div ref={host} className="figure-host sys" data-view={representation}/>;
}
