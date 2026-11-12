export const TAU = Math.PI * 2;
export const clamp = (v: number, lo=0, hi=1) => Math.min(hi,Math.max(lo,v));
export function random(seed: number) {
  let a=seed>>>0;
  return () => { a+=0x6D2B79F5; let t=a; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; };
}
export function colorAt(t: number, colors: string[]): [number,number,number] {
  t=((t%1)+1)%1*(colors.length-1);
  const i=Math.floor(t), f=t-i;
  const a=colors[i],b=colors[Math.min(i+1,colors.length-1)];
  return [1,3,5].map(k=>parseInt(a.slice(k,k+2),16)*(1-f)+parseInt(b.slice(k,k+2),16)*f) as [number,number,number];
}
export function rgb(t: number, colors: string[], alpha=1) { const c=colorAt(t,colors); return `rgba(${c.map(Math.round).join(',')},${alpha})`; }
export interface Pointer {x:number; y:number; down:boolean; active:boolean}
export const idlePointer: Pointer = {x:0,y:0,down:false,active:false};
