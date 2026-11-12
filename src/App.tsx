import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowLeft, ArrowRight, Check, ChevronDown, CircleHelp, Expand, ExternalLink, Eye, Github, Menu, Pause, Play, RotateCcw, Shuffle, SlidersHorizontal, X, Link as LinkIcon, Video, LoaderCircle } from 'lucide-react';
import { experiments, defaults, palettes, initialSeed, type Experiment, type Params } from './art/catalog';
import { random } from './art/math';
import { ArtStage, type StageHandle } from './components/ArtStage';
type Specimen={seed:number;params:Params;palette:number};
type Session=Record<string,Specimen>;
const storageKey='javashits-lab-v1';
function cleanSpecimen(e:Experiment,value:unknown):Specimen|undefined{
  if(!value||typeof value!=='object')return;
  const s=value as Specimen;
  if(!Number.isInteger(s.seed)||s.seed<0||s.seed>1e9||!Number.isInteger(s.palette)||s.palette<0||s.palette>=palettes.length||!s.params)return;
  const params=defaults(e);
  for(const p of e.parameters){const v=s.params[p.key];if(typeof v!=='number'||!Number.isFinite(v)||v<p.min||v>p.max)return;params[p.key]=v;}
  return {seed:s.seed,params,palette:s.palette};
}
function initialSession():{active:string;specimens:Session}{
  const specimens:Session=Object.fromEntries(experiments.map((e,i)=>[e.id,{params:defaults(e),seed:initialSeed+i*97,palette:0}]));
  let active='membrane';
  try{
    const stored=JSON.parse(localStorage.getItem(storageKey)||'{}');
    for(const e of experiments){const specimen=cleanSpecimen(e,stored.specimens?.[e.id]);if(specimen)specimens[e.id]=specimen;}
    if(experiments.some(e=>e.id===stored.active))active=stored.active;
    const hash=new URLSearchParams(location.hash.slice(1)),id=hash.get('lab'),data=hash.get('s');
    if(id&&data){const e=experiments.find(e=>e.id===id);if(e){const specimen=cleanSpecimen(e,JSON.parse(atob(data)));if(specimen){active=id;specimens[id]=specimen;}}}
  }catch{/* Storage and malformed shared links never prevent the lab from opening. */}
  return {active,specimens};
}
const initial=initialSession();
function Logo(){return <svg viewBox="0 0 40 40" aria-hidden="true" className="logo"><path d="M19 19C2 19 1 1 10 3c8 1 9 9 9 16Zm2 0C21 2 39 1 37 10c-1 8-9 9-16 9Zm0 2c17 0 18 18 9 16-8-1-9-9-9-16Zm-2 0C19 38 1 39 3 30c1-8 9-9 16-9Z" fill="currentColor"/></svg>;}
const fmt=(value:number,step:number)=>step>=1?value.toFixed(0):value.toFixed(step<.01?3:2);
function download(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),30000);}
function videoType(){
  if(typeof MediaRecorder==='undefined'||!HTMLCanvasElement.prototype.captureStream)return null;
  return ['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(type=>MediaRecorder.isTypeSupported(type))||null;
}
export default function App(){
  const [active,setActive]=useState(initial.active),[specimens,setSpecimens]=useState<Session>(initial.specimens);
  const [playing,setPlaying]=useState(()=>!matchMedia('(prefers-reduced-motion: reduce)').matches),[duration,setDuration]=useState(12),[time,setTime]=useState(0);
  const [ratio,setRatio]=useState('original'),[resolution,setResolution]=useState(3840),[zen,setZen]=useState(false),[drawer,setDrawer]=useState<'library'|'controls'|null>(null);
  const [about,setAbout]=useState(false),[toast,setToast]=useState(''),[ready,setReady]=useState(false),[exporting,setExporting]=useState(false);
  const [recording,setRecording]=useState(false),[recordTime,setRecordTime]=useState(0);
  const stage=useRef<StageHandle>(null),recorder=useRef<MediaRecorder|null>(null),recordStop=useRef<ReturnType<typeof setTimeout>|null>(null),recordCancelled=useRef(false);
  const exp=experiments.find(e=>e.id===active)!,specimen=specimens[active],index=experiments.indexOf(exp),mime=videoType();
  const notify=useCallback((text:string)=>setToast(text),[]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),4200);return()=>clearTimeout(timer);},[toast]);
  useEffect(()=>{const timer=setTimeout(()=>{try{localStorage.setItem(storageKey,JSON.stringify({active,specimens}));}catch{/* private mode or storage quota */}},250);return()=>clearTimeout(timer);},[active,specimens]);
  const patch=(change:Partial<Specimen>)=>setSpecimens(prev=>({...prev,[active]:{...prev[active],...change}}));
  const select=useCallback((id:string)=>{if(recorder.current?.state==='recording')return;if(id===active){setDrawer(null);return;}setActive(id);setDrawer(null);setTime(0);setReady(false);},[active]);
  const mutate=useCallback(()=>{
    if(recording)return;
    const seed=Math.floor(Math.random()*99999999),rnd=random(seed);
    const params:Params={};for(const p of exp.parameters){const v=p.min+(p.max-p.min)*(.12+rnd()*.76);params[p.key]=Number((Math.round(v/p.step)*p.step).toFixed(4));}
    if(active==='reaction'){
      const pairs=[[.036,.062],[.022,.051],[.03,.062],[.046,.063],[.054,.062],[.026,.055]],pair=pairs[Math.floor(rnd()*pairs.length)];params.feed=pair[0];params.kill=pair[1];params.diffusion=.42+rnd()*.18;
    }
    if(active==='attractor'){
      const systems=[[-1.4,1.6,1,.7],[1.7,1.7,.6,1.2],[-1.7,1.8,-.9,-.4],[-1.8,-2,.9,-.5],[1.5,-1.8,1.2,.8],[-1.4,1.6,.9,.8]];
      const values=systems[Math.floor(rnd()*systems.length)];['a','b','c','d'].forEach((key,i)=>params[key]=Number((values[i]+(rnd()-.5)*.08).toFixed(3)));
    }
    if(active==='excitable'){params.threshold=Math.floor(rnd()*2)+1;params.radius=1;}
    setSpecimens(prev=>({...prev,[active]:{...prev[active],seed,params}}));setTime(0);
  },[active,exp,recording]);
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if(about||recording||e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement||e.target instanceof HTMLTextAreaElement||e.metaKey||e.ctrlKey||e.altKey)return;
      if(e.code==='Space'){e.preventDefault();setPlaying(v=>!v);}
      if(e.key.toLowerCase()==='h')setZen(v=>!v);
      if(e.key.toLowerCase()==='m')mutate();
      if(e.key==='ArrowRight')select(experiments[(index+1)%experiments.length].id);
      if(e.key==='ArrowLeft')select(experiments[(index+experiments.length-1)%experiments.length].id);
      if(e.key==='Escape'){setDrawer(null);setZen(false);}
    };
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[index,select,mutate,about,recording]);
  useEffect(()=>{
    if(!recording)return;
    const start=performance.now(),timer=setInterval(()=>setRecordTime((performance.now()-start)/1000),100);
    const hidden=()=>{if(document.hidden){recordCancelled.current=true;recorder.current?.stop();notify('Recording interrupted because the tab was hidden. Try again with the tab in view.');}};
    document.addEventListener('visibilitychange',hidden);
    return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',hidden);};
  },[recording,notify]);
  useEffect(()=>()=>{if(recordStop.current)clearTimeout(recordStop.current);if(recorder.current?.state==='recording')recorder.current.stop();},[]);
  const exportPNG=async()=>{
    if(!ready||exporting||recording)return;
    setExporting(true);
    try{const blob=await stage.current!.png(resolution);download(blob,`javashits-${exp.id}-${specimen.seed}.png`);notify(`${resolution}px PNG captured. Your browser handles the download.`);}
    catch(error){notify(error instanceof Error?error.message:'Image export failed.');}finally{setExporting(false);}
  };
  const record=()=>{
    const canvas=stage.current?.canvas();if(!canvas||!mime||!ready)return;
    if(recording){recordCancelled.current=true;recorder.current?.stop();notify('Recording cancelled.');return;}
    let stream:MediaStream|undefined;
    try{
      stream=canvas.captureStream(30);const media=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:10000000});
      const chunks:BlobPart[]=[],name=`javashits-${exp.id}-${specimen.seed}.${mime.startsWith('video/mp4')?'mp4':'webm'}`;
      const wasPlaying=playing;recordCancelled.current=false;
      media.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      media.onstop=()=>{
        if(recordStop.current)clearTimeout(recordStop.current);stream?.getTracks().forEach(t=>t.stop());setRecording(false);setPlaying(wasPlaying);recorder.current=null;
        if(!recordCancelled.current&&chunks.length){download(new Blob(chunks,{type:mime}),name);notify('Video captured at the current preview resolution.');}
      };
      media.onerror=()=>{recordCancelled.current=true;notify('This browser could not encode the video. PNG capture is still available.');if(media.state==='recording')media.stop();};
      if(exp.periodic)stage.current?.seek(0);
      setPlaying(true);setRecordTime(0);setRecording(true);recorder.current=media;media.start(200);
      recordStop.current=setTimeout(()=>{if(media.state==='recording')media.stop();},duration*1000);
    }catch(error){stream?.getTracks().forEach(t=>t.stop());notify(error instanceof Error?error.message:'Video capture is unavailable on this browser.');}
  };
  const copyRecipe=async()=>{
    const url=new URL(location.href);url.hash=new URLSearchParams({lab:active,s:btoa(JSON.stringify(specimen))}).toString();
    try{await navigator.clipboard.writeText(url.href);notify('Specimen link copied. It includes the seed, mechanism settings, and palette.');}
    catch{notify('Clipboard unavailable. Saving a specimen recipe instead.');download(new Blob([JSON.stringify({experiment:active,...specimen,url:url.href},null,2)],{type:'application/json'}),`javashits-${active}-${specimen.seed}.json`);}
  };
  const reset=()=>{const params=defaults(exp),seed=initialSeed+index*97;patch({params,seed});stage.current?.reset(seed,params);setTime(0);notify('Original specimen restored.');};
  return <div className={`lab ${zen?'zen':''} ${drawer?'drawer-open':''}`}>
    <header className="topbar">
      <a className="brand" href="./" aria-label="Javashits home"><Logo/><span>JAVASHITS</span></a><span className="brand-divider"/><p className="tagline">THE PSYCHEDELIC JAVASCRIPT LAB</p>
      <nav className="topnav"><button onClick={()=>setAbout(true)}><CircleHelp size={15}/><span>About the lab</span></button><a href="https://github.com/merrypranxter/javashits" target="_blank" rel="noreferrer"><Github size={16}/><span>GitHub</span><ExternalLink size={12}/></a></nav>
    </header>
    {drawer&&<button className="drawer-backdrop" aria-label="Close panel" onClick={()=>setDrawer(null)}/>}
    <aside className={`library ${drawer==='library'?'open':''}`} aria-label="Experiments">
      <div className="panel-heading"><h2>EXPERIMENTS <span>12</span></h2><button className="drawer-close icon-button" aria-label="Close experiments" onClick={()=>setDrawer(null)}><X size={18}/></button></div>
      <div className="experiment-list">{experiments.map((e,i)=><button key={e.id} className={`experiment-row ${e.id===active?'active':''}`} onClick={()=>select(e.id)} aria-current={e.id===active?'true':undefined} disabled={recording}>
        <img src={`${import.meta.env.BASE_URL}previews/${e.id}.webp`} alt="" width="42" height="42"/><span className="experiment-row-copy"><span className="experiment-name"><span className="experiment-number">{String(i+1).padStart(2,'0')}</span>{e.name}</span><span className="experiment-principle">{e.principle}</span></span>
      </button>)}</div>
      <div className="library-note"><span className="live-dot"/> COMPUTED, NOT PRERENDERED</div>
    </aside>
    <main className="workspace">
      <div className="specimen-heading"><div><div className="specimen-meta"><span>{String(index+1).padStart(2,'0')} / 12</span><span>{exp.principle}</span></div><h1>{exp.name}</h1></div>
        <div className="specimen-arrows"><button className="icon-button" aria-label="Previous experiment" disabled={recording} onClick={()=>select(experiments[(index+11)%12].id)}><ArrowLeft size={17}/></button><button className="icon-button" aria-label="Next experiment" disabled={recording} onClick={()=>select(experiments[(index+1)%12].id)}><ArrowRight size={17}/></button></div>
      </div>
      <div className="stage-well"><div className={`stage-frame ${ratio!=='original'?'fixed-ratio':''}`} style={ratio!=='original'?{aspectRatio:ratio.replace(':','/'),'--aspect':Number(ratio.split(':')[0])/Number(ratio.split(':')[1])} as React.CSSProperties:{}}>
        <ArtStage key={exp.id} ref={stage} experiment={exp} params={specimen.params} palette={specimen.palette} seed={specimen.seed} playing={playing&&!exporting} duration={duration} ratio={ratio} onTime={setTime} onReady={setReady}/>
        {!ready&&<div className="preparing"><LoaderCircle className="spin" size={18}/><span>Preparing specimen</span></div>}
      </div></div>
      <div className="transport">
        <button className="play-button" onClick={()=>setPlaying(v=>!v)} disabled={recording} aria-label={playing?'Pause animation':'Play animation'}>{playing?<Pause size={17} fill="currentColor"/>:<Play size={17} fill="currentColor"/>}</button>
        <label className="duration-select"><span className="sr-only">Loop or recording duration</span><select value={duration} disabled={recording} onChange={e=>{setDuration(Number(e.target.value));stage.current?.seek(0);}}>{[6,12,24].map(s=><option key={s} value={s}>{s}s {exp.periodic?'loop':'clip'}</option>)}</select><ChevronDown size={12}/></label>
        {exp.periodic?<input className="timeline" aria-label="Loop position" type="range" min="0" max={duration} step="0.01" value={time%duration} disabled={recording} onChange={e=>{const seconds=Number(e.target.value);stage.current?.seek(seconds);setTime(seconds);}} style={{'--fill':`${time%duration/duration*100}%`} as React.CSSProperties}/>:<div className="evolution-indicator"><span className={playing?'live-dot':'paused-dot'}/><span>{playing?'Live evolution':'Evolution paused'}</span></div>}
        <span className="time-readout">{recording?<span className="record-indicator">REC {Math.min(recordTime,duration).toFixed(1)} / {duration}s</span>:exp.periodic?`${(time%duration).toFixed(1)}s / ${duration.toFixed(1)}s`:`${Math.floor(time)}s`}</span>
        <div className="transport-end"><button className="icon-button expand-button" aria-label="Fullscreen artwork" title="Fullscreen artwork" onClick={()=>{const elem=document.documentElement;if(!document.fullscreenElement&&elem.requestFullscreen){void elem.requestFullscreen().then(()=>setZen(true)).catch(()=>setZen(true));}else {void document.exitFullscreen?.();setZen(v=>!v);}}}><Expand size={18}/></button><button className="hide-button" onClick={()=>{setZen(v=>!v);setDrawer(null);}}><Eye size={14}/><span>{zen?'Show panels':'Hide panels'}</span></button></div>
      </div>
      <div className="stage-caption"><span>{exp.interaction}</span><span className="engine-label">{exp.engine}</span></div>
      <div className="mobile-panels"><button onClick={()=>setDrawer(drawer==='library'?null:'library')}><Menu size={17}/><span>Experiments</span><span className="mobile-index">{String(index+1).padStart(2,'0')} / 12</span></button><button onClick={()=>setDrawer(drawer==='controls'?null:'controls')}><SlidersHorizontal size={17}/><span>Mechanism</span></button><button aria-label="Mutate specimen" disabled={recording} onClick={mutate}><Shuffle size={18}/></button></div>
    </main>
    <aside className={`inspector ${drawer==='controls'?'open':''}`} aria-label="Mechanism controls">
      <div className="panel-heading inspector-heading"><h2>THE MECHANISM</h2><button className="drawer-close icon-button" aria-label="Close controls" onClick={()=>setDrawer(null)}><X size={18}/></button></div>
      <p className="mechanism-description">{exp.description}</p>
      <fieldset className="parameter-list" disabled={recording}>{exp.parameters.map(p=><label className="parameter" key={p.key} title={p.hint}><span className="parameter-header"><span>{p.label}</span><output>{fmt(specimen.params[p.key],p.step)}</output></span><input aria-label={p.label} type="range" min={p.min} max={p.max} step={p.step} value={specimen.params[p.key]} onChange={e=>patch({params:{...specimen.params,[p.key]:Number(e.target.value)}})} style={{'--fill':`${(specimen.params[p.key]-p.min)/(p.max-p.min)*100}%`} as React.CSSProperties}/><span className="parameter-hint">{p.hint}</span></label>)}</fieldset>
      <section className="color-section"><h2>COLOR SYSTEM</h2><div className="palette-picker"><div className="swatches" aria-hidden="true">{palettes[specimen.palette].colors.map(color=><span key={color} style={{background:color}}/>)}</div><label className="palette-select"><span className="sr-only">Color palette</span><select value={specimen.palette} disabled={recording} onChange={e=>patch({palette:Number(e.target.value)})}>{palettes.map((p,i)=><option key={p.name} value={i}>{p.name}</option>)}</select><ChevronDown size={13}/></label></div>
        <button className="mutate-button" onClick={mutate} disabled={recording}><Shuffle size={18}/>Mutate specimen<span className="shortcut">M</span></button>
        <button className="reset-button" onClick={reset} disabled={recording}><RotateCcw size={14}/>Reset parameters</button>
        <div className="seed-row"><span>SEED {String(specimen.seed).padStart(8,'0')}</span><button onClick={copyRecipe} title="Copy a link to this specimen" aria-label="Copy specimen link"><LinkIcon size={13}/><span>Copy recipe</span></button></div>
      </section>
      <section className="capture-section"><h2>CAPTURE</h2><label className="select-row"><span>Aspect ratio</span><span className="select-wrap"><select value={ratio} disabled={recording} onChange={e=>setRatio(e.target.value)} aria-label="Aspect ratio"><option value="original">Original</option><option value="1:1">Square · 1:1</option><option value="4:5">Portrait · 4:5</option><option value="16:9">Landscape · 16:9</option></select><ChevronDown size={13}/></span></label>
        <label className="select-row"><span>PNG size</span><span className="select-wrap"><select value={resolution} disabled={recording} onChange={e=>setResolution(Number(e.target.value))} aria-label="PNG resolution"><option value={1920}>1920px</option><option value={3840}>3840px</option></select><ChevronDown size={13}/></span></label>
        <button className="export-button" onClick={exportPNG} disabled={!ready||exporting||recording}>{exporting?<LoaderCircle size={16} className="spin"/>:<ArrowDownToLine size={17}/>}<span>{exporting?'Rendering PNG…':'Export PNG'}</span></button>
        {mime?<button className={`record-button ${recording?'recording':''}`} onClick={record} disabled={!ready||exporting}><Video size={15}/><span>{recording?`Cancel recording · ${Math.min(recordTime,duration).toFixed(0)}s`:`Record ${duration}s · ${mime.startsWith('video/mp4')?'MP4':'WebM'}`}</span></button>:<p className="capture-note">Video encoding unavailable in this browser.</p>}
        <p className="capture-note">{exp.periodic?'Phase-periodic motion.':'This system evolves; clips are not seamless loops.'} Video uses preview resolution.</p>
      </section>
    </aside>
    <footer className="statusbar"><span>12 systems. Infinite mutations.</span><span className="footer-hint">SPACE <span>pause</span> <i/> M <span>mutate</span> <i/> H <span>hide panels</span></span><span>WEBGL + CANVAS</span></footer>
    {zen&&<button className="zen-return" onClick={()=>setZen(false)}><SlidersHorizontal size={15}/>Show panels <kbd>H</kbd></button>}
    {toast&&<div className="toast" role="status"><Check size={16}/><span>{toast}</span><button aria-label="Dismiss notification" onClick={()=>setToast('')}><X size={14}/></button></div>}
    {about&&<About onClose={()=>setAbout(false)}/>}
  </div>;
}
function About({onClose}:{onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{dialog.current?.showModal();},[]);
  return <dialog className="about-dialog" ref={dialog} onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><button className="dialog-close icon-button" autoFocus aria-label="Close about" onClick={onClose}><X size={20}/></button><Logo/><h2>Beautiful computational<br/>misbehavior.</h2><p>Welcome to the Psychedelic JavaScript Lab. Twelve systems, each with a different idea about how matter, light, and patterns might behave.</p><p>Pull the mechanism apart. Push a parameter too far. Let something grow. If it gets strange, you’re in the right place.</p><div className="about-facts"><div><strong>Real computation</strong><span>WebGL 2 optical fields and grid simulations. Canvas 2D ray transport, weaving, density accumulation, and growth. No generated images in the artwork.</span></div><div><strong>Your specimens stay yours</strong><span>Settings save on this device. Copy a recipe to share its initial conditions; evolving histories are not saved.</span></div><div><strong>Capture honestly</strong><span>PNG exports render up to 3840px. Stateful fields retain their simulation resolution. Video uses the browser’s available MP4 or WebM encoder at preview resolution. No GIF encoder is included. Optical cycles are periodic; living simulations keep evolving. Real-time recording may drop frames on slower devices.</span></div><div><strong>Built for curious hands</strong><span>Drag directly on the artwork. Touch controls work without hover. WebGL 2 experiments require a compatible browser and GPU; five Canvas systems are also available.</span></div></div><a href="https://github.com/merrypranxter/javashits" target="_blank" rel="noreferrer">Open the laboratory source<ExternalLink size={14}/></a></dialog>;
}
