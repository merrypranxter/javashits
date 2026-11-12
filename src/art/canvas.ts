import { palettes, type Experiment, type Params } from './catalog';
import { clamp, colorAt, random, rgb, TAU, type Pointer } from './math';
import type { Renderer } from './types';
abstract class CanvasRenderer implements Renderer {
  protected ctx:CanvasRenderingContext2D;
  protected seed=0;
  protected colors=palettes[0].colors;
  constructor(protected canvas:HTMLCanvasElement){
    const ctx=canvas.getContext('2d',{alpha:false,willReadFrequently:true});if(!ctx)throw new Error('Canvas 2D is unavailable on this device.');this.ctx=ctx;
  }
  resize(w:number,h:number){if(this.canvas.width===w&&this.canvas.height===h)return;this.canvas.width=w;this.canvas.height=h;}
  reset(seed:number,_params:Params){this.seed=seed;}
  abstract render(phase:number,dt:number,params:Params,palette:number,pointer:Pointer):void;
  destroy(){}
  protected begin(palette:number){this.colors=palettes[palette].colors;this.ctx.fillStyle='#080b13';this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);}
}
export class CausticRenderer extends CanvasRenderer {
  private buffer=document.createElement('canvas');
  private bctx=this.buffer.getContext('2d',{willReadFrequently:true})!;
  private lastPhase=-10;
  private lastParams='';
  render(phase:number,_dt:number,p:Params,palette:number,pointer:Pointer){
    const key=JSON.stringify([p,palette,pointer]);
    if(Math.abs(phase-this.lastPhase)>.025||key!==this.lastParams){
      this.lastParams=key;this.lastPhase=phase;
      const size=640;this.buffer.width=size;this.buffer.height=size;
      const light=new Float32Array(size*size*3),rnd=random(this.seed);
      const waves=Array.from({length:p.ripples},(_,i)=>{
        const a=rnd()*TAU;return {x:Math.cos(a),y:Math.sin(a),k:4+rnd()*10,phase:rnd()*TAU+Math.sin(phase+i)*.65};
      });
      const side=420,delta=1/(side-1),bands=[1-p.dispersion*.45,1,1+p.dispersion*.45];
      for(let j=0;j<side;j++)for(let i=0;i<side;i++){
        const x=i*delta*2.8-1.4,y=j*delta*2.8-1.4;
        let dx=0,dy=0;
        for(const wave of waves){const c=Math.cos((x*wave.x+y*wave.y)*wave.k+wave.phase)*.085*p.curvature;dx+=wave.x*c;dy+=wave.y*c;}
        if(pointer.active){const rx=x-pointer.x*2.8,ry=y+pointer.y*2.8,d=rx*rx+ry*ry+.03;dx+=rx*Math.exp(-d*5)*.4;dy+=ry*Math.exp(-d*5)*.4;}
        for(let s=0;s<3;s++){
          const ox=((x+dx*p.depth*bands[s])/2.8+.5)*(size-1),oy=((y+dy*p.depth*bands[s])/2.8+.5)*(size-1);
          const ix=Math.floor(ox),iy=Math.floor(oy);if(ix<0||iy<0||ix>=size-1||iy>=size-1)continue;
          const fx=ox-ix,fy=oy-iy,k=(iy*size+ix)*3+s;
          light[k]+=(1-fx)*(1-fy);light[k+3]+=fx*(1-fy);light[k+size*3]+=(1-fx)*fy;light[k+size*3+3]+=fx*fy;
        }
      }
      const image=this.bctx.createImageData(size,size);const data=image.data;
      const tint=[colorAt(.12,palettes[palette].colors),colorAt(.5,palettes[palette].colors),colorAt(.84,palettes[palette].colors)];
      for(let i=0;i<size*size;i++){
        let r=light[i*3],g=light[i*3+1],b=light[i*3+2];
        if(palette>0){const nr=(r*tint[0][0]+g*tint[1][0]+b*tint[2][0])/255,ng=(r*tint[0][1]+g*tint[1][1]+b*tint[2][1])/255,nb=(r*tint[0][2]+g*tint[1][2]+b*tint[2][2])/255;r=nr;g=ng;b=nb;}
        data[i*4]=255*(1-Math.exp(-r*1.4));data[i*4+1]=255*(1-Math.exp(-g*1.4));data[i*4+2]=255*(1-Math.exp(-b*1.4));data[i*4+3]=255;
      }
      this.bctx.putImageData(image,0,0);
    }
    this.begin(palette);const w=this.canvas.width,h=this.canvas.height;
    this.ctx.imageSmoothingEnabled=true;this.ctx.drawImage(this.buffer,0,0,w,h);
  }
}
export class LoomRenderer extends CanvasRenderer {
  render(phase:number,_dt:number,p:Params,palette:number,pointer:Pointer){
    this.begin(palette);const ctx=this.ctx,w=this.canvas.width,h=this.canvas.height,m=Math.min(w,h),n=p.threads;
    const step=m*1.24/n,thick=step*p.filament;
    const map=(x:number,y:number):[number,number]=>{
      const xx=x+(p.bend*.08)*Math.sin(y*TAU*1.2+Math.sin(phase))+.035*p.bend*Math.cos((x+y)*9.+Math.cos(phase));
      const yy=y+p.bend*.07*Math.sin(x*TAU*1.5+Math.cos(phase))+.025*p.bend*Math.cos((x-y)*13.+Math.sin(phase));
      const d=pointer.active?Math.exp(-((x-.5-pointer.x)**2+(y-.5+pointer.y)**2)*12):0;
      return [w/2+(xx-.5)*m*1.24+pointer.x*d*m*.15,h/2+(yy-.5)*m*1.24-pointer.y*d*m*.15];
    };
    const stroke=(i:number,j:number,vertical:boolean,over:boolean)=>{
      ctx.beginPath();
      for(let k=0;k<=6;k++){
        const t=(k/6-.5)*1.02;const xy=map((i+(vertical?0:t))/n,(j+(vertical?t:0))/n);
        if(k===0)ctx.moveTo(...xy);else ctx.lineTo(...xy);
      }
      ctx.lineCap='round';ctx.lineJoin='round';
      ctx.strokeStyle=over?'rgba(0,0,0,.86)':'rgba(0,0,0,.55)';ctx.lineWidth=thick*1.45;ctx.stroke();
      const t=(vertical?i/n*.8+.09:j/n*.8+.4)+.12*Math.sin((i+j)*.16+phase);
      ctx.strokeStyle=rgb(t,this.colors);ctx.lineWidth=thick;ctx.stroke();
      ctx.strokeStyle=rgb(t+.13,this.colors,.8);ctx.lineWidth=thick*.42;ctx.stroke();
      ctx.strokeStyle=`rgba(255,255,255,${over?.56:.22})`;ctx.lineWidth=Math.max(.5,thick*.1);ctx.stroke();
    };
    for(let j=-2;j<n+3;j++)for(let i=-2;i<n+3;i++){
      const over=((i-j)%(p.weave+1)+(p.weave+1))%(p.weave+1)!==0;
      stroke(i,j,!over,false);stroke(i,j,over,true);
    }
  }
}
type Branch={x:number;y:number;parent:number;dx:number;dy:number;depth:number;weight:number};
type Target={x:number;y:number;alive:boolean};
export class MyceliumRenderer extends CanvasRenderer {
  private nodes:Branch[]=[];
  private targets:Target[]=[];
  private rnd=random(1);
  private steps=0;
  private lastCount=0;
  private lastDown=false;
  private time=0;
  reset(seed:number,p:Params){
    super.reset(seed,p);this.rnd=random(seed);this.lastCount=p.nutrients;this.steps=0;this.time=0;
    this.nodes=[];
    for(let i=0;i<6;i++){const a=TAU*i/6;this.nodes.push({x:.5+Math.cos(a)*.008,y:.5+Math.sin(a)*.008,parent:-1,dx:Math.cos(a),dy:Math.sin(a),depth:0,weight:1});}
    this.targets=Array.from({length:p.nutrients},()=>({x:.04+this.rnd()*.92,y:.04+this.rnd()*.92,alive:true}));
    for(let i=0;i<30;i++)this.grow(p);
  }
  private grow(p:Params){
    if(this.nodes.length>5500)return;
    const influences=new Map<number,{dx:number;dy:number;n:number}>();
    // Spatial buckets keep nutrient competition local rather than O(targets × branches).
    const cell=p.reach,buckets=new Map<string,number[]>();
    this.nodes.forEach((n,i)=>{const key=`${Math.floor(n.x/cell)},${Math.floor(n.y/cell)}`;const b=buckets.get(key)||[];b.push(i);buckets.set(key,b);});
    let living=0;
    for(const t of this.targets){
      if(!t.alive)continue;living++;let nearest=-1,best=p.reach*p.reach;
      const cx=Math.floor(t.x/cell),cy=Math.floor(t.y/cell);
      for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){
        const candidates=buckets.get(`${cx+ox},${cy+oy}`);if(!candidates)continue;
        for(const i of candidates){const n=this.nodes[i],d=(t.x-n.x)**2+(t.y-n.y)**2;if(d<best){best=d;nearest=i;}}
      }
      if(best<p.competition*p.competition){t.alive=false;continue;}
      if(nearest>=0){const n=this.nodes[nearest],d=Math.sqrt(best),inf=influences.get(nearest)||{dx:0,dy:0,n:0};inf.dx+=(t.x-n.x)/d;inf.dy+=(t.y-n.y)/d;inf.n++;influences.set(nearest,inf);}
    }
    if(!living)return;
    const additions:Branch[]=[];
    for(const [i,v] of influences){
      const n=this.nodes[i];let dx=v.dx/v.n+n.dx*p.branching,dy=v.dy/v.n+n.dy*p.branching;
      const d=Math.hypot(dx,dy)||1;dx/=d;dy/=d;
      const x=n.x+dx*.007,y=n.y+dy*.007;
      if(this.nodes.some((other,k)=>k>this.nodes.length-160&&(x-other.x)**2+(y-other.y)**2<.000012))continue;
      additions.push({x,y,parent:i,dx,dy,depth:n.depth+1,weight:1});
      let ancestor=i;for(let j=0;j<28&&ancestor>=0;j++){this.nodes[ancestor].weight+=.11;ancestor=this.nodes[ancestor].parent;}
    }
    this.nodes.push(...additions);this.steps++;
  }
  render(_phase:number,dt:number,p:Params,palette:number,pointer:Pointer){
    if(p.nutrients!==this.lastCount)this.reset(this.seed,p);
    if(pointer.down&&!this.lastDown){
      const x=.5+pointer.x,y=.5-pointer.y;
      this.nodes.push({x,y,parent:-1,dx:0,dy:-1,depth:0,weight:1});
      for(let i=0;i<140;i++){const a=this.rnd()*TAU,r=this.rnd()*.15;this.targets.push({x:x+Math.cos(a)*r,y:y+Math.sin(a)*r,alive:true});}
    }
    this.lastDown=pointer.down;
    this.time+=dt*28;let steps=Math.min(4,Math.floor(this.time));this.time-=steps;
    while(steps-->0)this.grow(p);
    this.begin(palette);const ctx=this.ctx,w=this.canvas.width,h=this.canvas.height,m=Math.min(w,h)*.93;
    const tx=(x:number)=>w/2+(x-.5)*m,ty=(y:number)=>h/2+(y-.5)*m;
    const glow=ctx.createRadialGradient(w*.5,h*.5,0,w*.5,h*.5,m*.65);glow.addColorStop(0,'#121c23');glow.addColorStop(1,'#050810');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
    for(const t of this.targets){if(!t.alive)continue;ctx.fillStyle=rgb((t.x+t.y)*.55,this.colors,.3);ctx.beginPath();ctx.arc(tx(t.x),ty(t.y),Math.max(.65,m*.0009),0,TAU);ctx.fill();}
    ctx.lineCap='round';ctx.globalCompositeOperation='screen';
    for(let pass=0;pass<2;pass++)for(const n of this.nodes){
      if(n.parent<0)continue;const parent=this.nodes[n.parent];
      const width=Math.min(5.5,.6+n.weight*.22)*m/700;
      ctx.beginPath();ctx.moveTo(tx(parent.x),ty(parent.y));ctx.lineTo(tx(n.x),ty(n.y));
      ctx.strokeStyle=rgb(n.depth*.007+n.x*.35,this.colors,pass===0?.14:.95);ctx.lineWidth=width*(pass===0?4:1);ctx.stroke();
      if(pass===1&&n.depth%8===0){ctx.fillStyle=rgb(n.depth*.007+n.x*.35+.18,this.colors,.9);ctx.beginPath();ctx.arc(tx(n.x),ty(n.y),width*.8,0,TAU);ctx.fill();}
    }
    ctx.globalCompositeOperation='source-over';
  }
}
export class CrystalRenderer extends CanvasRenderer {
  private size=161;
  private frozen=new Uint8Array(this.size*this.size);
  private vapor=new Float32Array(this.size*this.size);
  private next=new Float32Array(this.size*this.size);
  private mass=new Float32Array(this.size*this.size);
  private age=new Uint16Array(this.size*this.size);
  private generation=1;
  private accumulator=0;
  private lastDown=false;
  private directions=[1,-1,this.size,-this.size,this.size-1,1-this.size];
  reset(seed:number,p:Params){
    super.reset(seed,p);this.frozen.fill(0);this.vapor.fill(p.vapor);this.mass.fill(0);this.age.fill(0);this.generation=1;this.accumulator=0;
    const mid=Math.floor(this.size/2);
    for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++)if(Math.abs(x+y)<=2)this.freeze((mid+y)*this.size+mid+x);
    for(let i=0;i<1400;i++)this.grow(p);
  }
  private freeze(i:number){this.frozen[i]=1;this.vapor[i]=0;this.mass[i]=0;this.age[i]=this.generation;}
  private grow(p:Params){
    const n=this.size,dirs=this.directions;this.generation++;
    for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){
      const i=y*n+x;
      const q=x-Math.floor(n/2),r=y-Math.floor(n/2);
      if(Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r))>n*.43){this.next[i]=p.vapor;continue;}
      if(this.frozen[i]){this.next[i]=0;continue;}
      let total=0,neighbors=0;for(const offset of dirs){total+=this.vapor[i+offset];neighbors+=this.frozen[i+offset];}
      const diffused=this.vapor[i]+.45*(total/6-this.vapor[i]);
      if(neighbors){
        const exposure=1+p.anisotropy*(1-neighbors/3)*1.8;
        this.mass[i]+=diffused*.3*exposure+.004*p.vapor;
        this.next[i]=diffused*.2;
      }else this.next[i]=diffused;
    }
    [this.vapor,this.next]=[this.next,this.vapor];
    for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){const i=y*n+x;if(!this.frozen[i]&&this.mass[i]>=p.attachment)this.freeze(i);}
    for(let i=0;i<n;i++){this.vapor[i]=p.vapor;this.vapor[(n-1)*n+i]=p.vapor;this.vapor[i*n]=p.vapor;this.vapor[i*n+n-1]=p.vapor;}
  }
  render(_phase:number,dt:number,p:Params,palette:number,pointer:Pointer){
    const n=this.size,w=this.canvas.width,h=this.canvas.height,m=Math.min(w,h),step=m*.0047*p.lattice,mid=Math.floor(n/2);
    if(pointer.down&&!this.lastDown){
      const r=Math.round(-pointer.y*m/(step*.866)),q=Math.round(pointer.x*m/step-r*.5);
      const x=mid+q,y=mid+r;if(x>1&&x<n-2&&y>1&&y<n-2)this.freeze(y*n+x);
    }
    this.lastDown=pointer.down;this.accumulator+=dt*300;
    let count=Math.min(18,Math.floor(this.accumulator));this.accumulator-=count;while(count-->0)this.grow(p);
    this.begin(palette);const ctx=this.ctx;
    const glow=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,m*.6);glow.addColorStop(0,'#19132e');glow.addColorStop(1,'#050810');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
    for(let y=1;y<n-1;y++)for(let x=1;x<n-1;x++){
      const i=y*n+x;if(!this.frozen[i])continue;
      const q=x-mid,r=y-mid,px=w/2+(q+r*.5)*step,py=h/2+r*.866*step;
      if(px<-step||py<-step||px>w+step||py>h+step)continue;
      const dist=Math.sqrt(q*q+r*r+q*r);
      const t=.25+dist*.008+this.age[i]*.0002+(this.seed%100)*.004;
      const edge=this.directions.some(d=>!this.frozen[i+d]);
      ctx.fillStyle=rgb(t,this.colors);ctx.beginPath();
      for(let k=0;k<6;k++){const a=(k+.5)*TAU/6;const vx=px+Math.cos(a)*step*.575,vy=py+Math.sin(a)*step*.575;if(k===0)ctx.moveTo(vx,vy);else ctx.lineTo(vx,vy);}ctx.closePath();ctx.fill();
      ctx.strokeStyle=edge?'rgba(230,255,255,.65)':'rgba(235,220,255,.12)';ctx.lineWidth=Math.max(.5,step*.12);ctx.stroke();
      ctx.beginPath();ctx.moveTo(px-step*.35,py);ctx.lineTo(px,py-step*.4);ctx.lineTo(px+step*.35,py);ctx.strokeStyle=edge?'rgba(255,255,255,.7)':'rgba(255,255,255,.22)';ctx.lineWidth=step*.1;ctx.stroke();
    }
  }
}
export class AttractorRenderer extends CanvasRenderer {
  private size=720;
  private density=new Float32Array(this.size*this.size);
  private flow=new Float32Array(this.size*this.size);
  private buffer=document.createElement('canvas');
  private bctx=this.buffer.getContext('2d',{willReadFrequently:true})!;
  private x=.1;private y=.2;
  private maximum=1;
  private lastKey='';
  private iterations=0;
  reset(seed:number,p:Params){super.reset(seed,p);this.density.fill(0);this.flow.fill(0);this.x=(seed%100)/100;this.y=.1;this.maximum=1;this.iterations=0;this.lastKey=JSON.stringify(p);this.buffer.width=this.size;this.buffer.height=this.size;this.advance(p,200000);}
  private advance(p:Params,count:number){
    const n=this.size,scaleX=(1+Math.abs(p.c))*2.18,scaleY=(1+Math.abs(p.d))*2.18;
    for(let i=0;i<count;i++){
      const nx=Math.sin(p.a*this.y)+p.c*Math.cos(p.a*this.x),ny=Math.sin(p.b*this.x)+p.d*Math.cos(p.b*this.y);
      const speed=Math.hypot(nx-this.x,ny-this.y);this.x=nx;this.y=ny;
      const px=(nx/scaleX+.5)*(n-1),py=(ny/scaleY+.5)*(n-1),ix=Math.floor(px),iy=Math.floor(py);
      if(ix<0||iy<0||ix>=n-1||iy>=n-1)continue;
      const fx=px-ix,fy=py-iy,k=iy*n+ix;
      const offsets=[k,k+1,k+n,k+n+1],weights=[(1-fx)*(1-fy),fx*(1-fy),(1-fx)*fy,fx*fy];
      for(let j=0;j<4;j++){const at=offsets[j];this.density[at]+=weights[j];this.flow[at]+=weights[j]*speed;this.maximum=Math.max(this.maximum,this.density[at]);}
    }
    this.iterations+=count;
  }
  render(_phase:number,dt:number,p:Params,palette:number,pointer:Pointer){
    if(this.lastKey!==JSON.stringify(p))this.reset(this.seed,p);
    if(pointer.down){this.x=pointer.x*3;this.y=pointer.y*3;}
    if(dt>0&&this.iterations<30000000)this.advance(p,Math.min(120000,Math.floor(dt*2400000)));
    this.colors=palettes[palette].colors;const n=this.size,image=this.bctx.createImageData(n,n),data=image.data;
    const exposure=Math.log(1+this.maximum)*.8;
    const lut=Array.from({length:1024},(_,i)=>colorAt(i/1024,this.colors));
    for(let i=0;i<this.density.length;i++){
      const d=this.density[i],v=clamp(Math.log(1+d)/exposure),brightness=Math.pow(v,.72);
      const t=(.12+v*.5+(d?this.flow[i]/d:0)*.15)%1,c=lut[Math.floor(t*1023)];
      data[i*4]=c[0]*brightness+3;data[i*4+1]=c[1]*brightness+5;data[i*4+2]=c[2]*brightness+10;data[i*4+3]=255;
    }
    this.bctx.putImageData(image,0,0);this.ctx.drawImage(this.buffer,0,0,this.canvas.width,this.canvas.height);
  }
}
export function createCanvasRenderer(canvas:HTMLCanvasElement,experiment:Experiment,seed:number,params:Params):Renderer {
  const constructors:Record<string,new(c:HTMLCanvasElement)=>CanvasRenderer>={caustic:CausticRenderer,loom:LoomRenderer,mycelium:MyceliumRenderer,crystal:CrystalRenderer,attractor:AttractorRenderer};
  const renderer=new constructors[experiment.id](canvas);renderer.reset(seed,params);return renderer;
}
