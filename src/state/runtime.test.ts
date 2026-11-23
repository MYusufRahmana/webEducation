import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Runtime } from "./runtime";
import type { TopicModule } from "../topics/types";

type Demo = {t:number;log:unknown[]};
let frames:Map<number,FrameRequestCallback>;
let sequence:number;
let now:number;
function pump(count:number){for(let i=0;i<count;i++){now+=1000/60;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now));}}
function topic():TopicModule<Demo>{return {steps:[{key:'first',highlight:[],build:()=>({t:0,log:[]}),holdAt:.1},{key:'second',highlight:[],build:()=>({t:1,log:[]}),holdAt:1.2}],advance:(s:Demo,dt:number)=>{s.t+=dt;},announce:()=>null} as unknown as TopicModule<Demo>;}
beforeEach(()=>{frames=new Map();sequence=0;now=0;vi.stubGlobal('document',{visibilityState:'visible',addEventListener:vi.fn(),removeEventListener:vi.fn()});vi.stubGlobal('requestAnimationFrame',(fn:FrameRequestCallback)=>{frames.set(++sequence,fn);return sequence;});vi.stubGlobal('cancelAnimationFrame',(id:number)=>frames.delete(id));});
afterEach(()=>vi.unstubAllGlobals());
describe('lesson playback',()=>{
 it('repeats the active event window without freezing or advancing the lesson',()=>{const r=new Runtime(topic());const times:number[]=[];r.addDrawer(s=>times.push(s.t));pump(70);expect(times.filter((t,i)=>i>0&&t<times[i-1]).length).toBeGreaterThan(3);expect(r.getSnapshot().held).toBe(false);expect(r.currentStep).toBe(0);r.dispose();});
 it('respects manual pause and starts a new step in motion',()=>{const r=new Runtime(topic());let time=0;r.addDrawer(s=>{time=s.t;});pump(3);r.setPaused(true);const paused=time;pump(20);expect(time).toBe(paused);r.setStep(1);expect(r.getSnapshot().paused).toBe(false);pump(3);expect(time).toBeGreaterThan(1);r.dispose();});
 it('keeps the recap static and can preserve legacy print holds',()=>{const r=new Runtime(topic());r.setStep(1,{end:true});pump(30);expect(r.getSnapshot().sim.t).toBe(1.2);expect(r.getSnapshot().held).toBe(true);r.dispose();const legacy=new Runtime(topic(),{repeat:false});legacy.connect();pump(30);expect(legacy.getSnapshot().held).toBe(true);expect(legacy.getSnapshot().sim.t).toBeCloseTo(.1);legacy.dispose();});
});
