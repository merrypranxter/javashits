import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Experiment, Params } from '../art/catalog';
import { createRenderer } from '../art/renderer';
import { idlePointer, TAU, type Pointer } from '../art/math';
import type { Renderer } from '../art/types';
export interface StageHandle {
  canvas:()=>HTMLCanvasElement|null;
  png:(longEdge:number)=>Promise<Blob>;
  seek:(seconds:number)=>void;
  reset:(seed?:number,params?:Params)=>void;
}
type Props={experiment:Experiment;params:Params;palette:number;seed:number;playing:boolean;duration:number;ratio:string;onTime:(time:number)=>void;onReady:(ready:boolean)=>void};
export const ArtStage=forwardRef<StageHandle,Props>(function ArtStage(props,ref){
  const holder=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null),renderer=useRef<Renderer|null>(null);
  const live=useRef(props);live.current=props;
  const time=useRef(0),pointer=useRef<Pointer>({...idlePointer}),renderSize=useRef({w:0,h:0});
  const [error,setError]=useState('');
  useImperativeHandle(ref,()=>({
    canvas:()=>canvas.current,
    seek:(seconds)=>{time.current=seconds;},
    reset:(seed,params)=>{time.current=0;renderer.current?.reset(seed??live.current.seed,params??live.current.params);},
    png:async(longEdge)=>{
      const c=canvas.current,r=renderer.current;if(!c||!r)throw new Error('The artwork is not ready.');
      const {w,h}=renderSize.current;
      const scale=longEdge/Math.max(w,h);
      try{
        r.resize(Math.round(w*scale),Math.round(h*scale));
        r.render(time.current/live.current.duration*TAU,0,live.current.params,live.current.palette,{...pointer.current,down:false});
        return await new Promise<Blob>((resolve,reject)=>c.toBlob(blob=>blob?resolve(blob):reject(new Error('The browser could not encode this image.')),'image/png'));
      }finally{r.resize(w,h);r.render(time.current/live.current.duration*TAU,0,live.current.params,live.current.palette,{...pointer.current,down:false});}
    }
  }),[]);
  useEffect(()=>{
    const c=canvas.current,wrap=holder.current;if(!c||!wrap)return;
    setError('');live.current.onReady(false);pointer.current={...idlePointer};time.current=0;
    let engine:Renderer;
    try{engine=createRenderer(c,live.current.experiment,live.current.seed,live.current.params);renderer.current=engine;}
    catch(error){setError(error instanceof Error?error.message:'The renderer could not start.');return;}
    const resize=()=>{
      const rect=wrap.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,1.6);
      const cap=Math.min(1,Math.sqrt(1450000/Math.max(1,rect.width*rect.height*dpr*dpr)));
      const w=Math.max(2,Math.floor(rect.width*dpr*cap)),h=Math.max(2,Math.floor(rect.height*dpr*cap));
      renderSize.current={w,h};engine.resize(w,h);
    };
    resize();const observer=new ResizeObserver(resize);observer.observe(wrap);
    let raf=0,last=0,notify=0,dirty=true,previousKey='';const frame=(now:number)=>{
      const elapsed=last?(now-last)/1000:0;last=now;
      const rawDt=Math.min(elapsed,.05);
      const p=live.current,visible=!document.hidden,dt=p.playing&&visible?rawDt:0;
      if(dt)time.current+=p.experiment.periodic?elapsed:dt;
      // Analytic systems follow an exact phase cycle. Simulations keep their history.
      if(p.experiment.periodic&&time.current>=p.duration)time.current%=p.duration;
      const renderKey=JSON.stringify([p.params,p.palette,time.current,pointer.current,c.width,c.height]);
      if(visible&&(dirty||dt>0||renderKey!==previousKey)){
        previousKey=renderKey;
        try{engine.render(time.current/p.duration*TAU,dt,p.params,p.palette,pointer.current);}
        catch(error){setError(error instanceof Error?error.message:'Rendering failed.');p.onReady(false);cancelAnimationFrame(raf);return;}
        if(dirty){dirty=false;p.onReady(true);}
      }
      if(now-notify>90){p.onTime(time.current);notify=now;}
      raf=requestAnimationFrame(frame);
    };raf=requestAnimationFrame(frame);
    const lost=(e:Event)=>{e.preventDefault();setError('The graphics context was interrupted. Reopen this experiment to restore it.');live.current.onReady(false);cancelAnimationFrame(raf);};
    c.addEventListener('webglcontextlost',lost);
    return()=>{cancelAnimationFrame(raf);observer.disconnect();c.removeEventListener('webglcontextlost',lost);engine.destroy();renderer.current=null;};
  },[props.experiment.id]);
  useEffect(()=>{time.current=0;renderer.current?.reset(props.seed,props.params);},[props.seed]);
  const updatePointer=(e:React.PointerEvent<HTMLCanvasElement>)=>{
    const c=e.currentTarget,rect=c.getBoundingClientRect(),m=Math.min(rect.width,rect.height);
    pointer.current={x:(e.clientX-rect.left-rect.width/2)/m,y:-(e.clientY-rect.top-rect.height/2)/m,active:true,down:e.buttons>0||e.type==='pointerdown'};
  };
  return <div className="art-surface" ref={holder} data-experiment={props.experiment.id}>
    <canvas key={props.experiment.id} ref={canvas} aria-label={`${props.experiment.name}: interactive generative artwork`}
      onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);updatePointer(e);}}
      onPointerMove={e=>{if(e.buttons>0)updatePointer(e);}}
      onPointerUp={()=>{pointer.current.down=false;}}
      onPointerCancel={()=>{pointer.current.down=false;}}
    />
    {error&&<div className="render-error" role="alert"><strong>The specimen needs a different habitat.</strong><p>{error}</p></div>}
  </div>;
});
