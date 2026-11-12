import { palettes, type Experiment, type Params } from './catalog';
import { random, type Pointer } from './math';
import type { Renderer } from './types';
import { vertex, shaders, reactionStep, excitableStep } from './shaders';

export class GLRenderer implements Renderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private stepProgram: WebGLProgram | null = null;
  private textures: WebGLTexture[]=[];
  private framebuffers: WebGLFramebuffer[]=[];
  private size=320;
  private front=0;
  private seed=0;
  private accumulator=0;
  private previousStates=0;
  private uniforms = new Map<WebGLProgram, Map<string,WebGLUniformLocation|null>>();
  constructor(private canvas:HTMLCanvasElement,private experiment:Experiment,seed:number,params:Params){
    const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
    if(!gl)throw new Error('This experiment needs WebGL 2. Try Chromatic loom, Mycelium circuit, Crystal accretion, Photon caustics, or Strange attractor on this device.');
    this.gl=gl;
    this.program=this.compile(shaders[experiment.id]);
    if(experiment.id==='reaction'||experiment.id==='excitable'){
      this.stepProgram=this.compile(experiment.id==='reaction'?reactionStep:excitableStep);
      for(let i=0;i<2;i++){
        const tex=gl.createTexture()!;gl.bindTexture(gl.TEXTURE_2D,tex);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,experiment.id==='reaction'?gl.LINEAR:gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,experiment.id==='reaction'?gl.LINEAR:gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
        this.textures.push(tex);
        const fb=gl.createFramebuffer()!;this.framebuffers.push(fb);
        gl.bindFramebuffer(gl.FRAMEBUFFER,fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    }
    this.reset(seed,params);
  }
  private compile(fragment:string){
    const gl=this.gl;
    const compileShader=(type:number,source:string)=>{
      const shader=gl.createShader(type)!;gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw new Error(`Shader compilation failed: ${message}`);}
      return shader;
    };
    const v=compileShader(gl.VERTEX_SHADER,vertex),f=compileShader(gl.FRAGMENT_SHADER,fragment);
    const program=gl.createProgram()!;gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);
    gl.deleteShader(v);gl.deleteShader(f);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'Could not link renderer');
    this.uniforms.set(program,new Map());return program;
  }
  private loc(program:WebGLProgram,name:string){const m=this.uniforms.get(program)!;if(!m.has(name))m.set(name,this.gl.getUniformLocation(program,name));return m.get(name)!;}
  private values(params:Params){return this.experiment.parameters.map(p=>params[p.key]);}
  reset(seed:number,params:Params){
    this.seed=seed;this.accumulator=0;
    if(!this.stepProgram)return;
    const gl=this.gl,rnd=random(seed),n=this.size,data=new Uint8Array(n*n*4);
    this.previousStates=params.states;
    const centers=Array.from({length:35},()=>({x:rnd()*n,y:rnd()*n,r:3+rnd()*10}));
    const spiralCenters=Array.from({length:7},()=>({x:rnd()*n,y:rnd()*n,spin:rnd()>.5?1:-1}));
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      const idx=(y*n+x)*4;
      if(this.experiment.id==='excitable'){
        let center=spiralCenters[0],nearest=1e9;
        for(const c of spiralCenters){const d=(x-c.x)**2+(y-c.y)**2;if(d<nearest){nearest=d;center=c;}}
        const angle=Math.atan2(y-center.y,x-center.x)*center.spin;
        const phase=angle/(Math.PI*2)+Math.sqrt(nearest)*.012;
        data[idx]=((Math.floor(phase*params.states)%params.states)+params.states)%params.states;data[idx+3]=255;
      }
      else{
        const seeded=centers.some(c=>(x-c.x)**2+(y-c.y)**2<c.r*c.r);
        const a=seeded?.45:1,b=seeded?.42+rnd()*.12:0;
        data[idx]=Math.floor(a*255);data[idx+1]=Math.round((a*255%1)*255);
        data[idx+2]=Math.floor(b*255);data[idx+3]=Math.round((b*255%1)*255);
      }
    }
    for(let i=0;i<2;i++){
      gl.bindTexture(gl.TEXTURE_2D,this.textures[i]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,n,n,0,gl.RGBA,gl.UNSIGNED_BYTE,data);
      gl.bindFramebuffer(gl.FRAMEBUFFER,this.framebuffers[i]);
      if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Your graphics device could not initialize the simulation.');
    }
    this.front=0;this.step(params,{x:0,y:0,active:false,down:false},this.experiment.id==='reaction'?180:20);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  }
  resize(w:number,h:number){if(this.canvas.width===w&&this.canvas.height===h)return;this.canvas.width=w;this.canvas.height=h;}
  private step(params:Params,pointer:Pointer,count:number){
    const gl=this.gl,program=this.stepProgram!;
    gl.useProgram(program);gl.uniform4fv(this.loc(program,'u_p'),this.values(params));
    gl.uniform1f(this.loc(program,'u_seed'),this.seed%10000);
    const m=Math.min(this.canvas.width,this.canvas.height);
    gl.uniform3f(this.loc(program,'u_pointer'),pointer.x*m/this.canvas.width,pointer.y*m/this.canvas.height,pointer.down?1:0);
    gl.uniform1i(this.loc(program,'u_state'),0);gl.viewport(0,0,this.size,this.size);
    for(let i=0;i<count;i++){
      gl.bindFramebuffer(gl.FRAMEBUFFER,this.framebuffers[1-this.front]);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.textures[this.front]);gl.drawArrays(gl.TRIANGLES,0,3);this.front=1-this.front;
    }
  }
  render(phase:number,dt:number,params:Params,palette:number,pointer:Pointer){
    const gl=this.gl,program=this.program;
    if(this.stepProgram){
      if(this.experiment.id==='excitable'&&this.previousStates!==params.states)this.reset(this.seed,params);
      this.accumulator+=dt*(this.experiment.id==='reaction'?420:24);
      let count=Math.min(24,Math.floor(this.accumulator));this.accumulator-=count;
      if(pointer.down)count=Math.max(count,1);
      if(count)this.step(params,pointer,count);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.textures[this.front]);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.useProgram(program);
    gl.uniform2f(this.loc(program,'u_resolution'),this.canvas.width,this.canvas.height);
    gl.uniform1f(this.loc(program,'u_phase'),phase);gl.uniform1f(this.loc(program,'u_seed'),this.seed%10000);
    gl.uniform4fv(this.loc(program,'u_p'),this.values(params));gl.uniform1i(this.loc(program,'u_palette'),palette);
    gl.uniform3f(this.loc(program,'u_pointer'),pointer.x,pointer.y,pointer.active?1:0);
    gl.uniform1i(this.loc(program,'u_state'),0);
    const colors=palettes[palette].colors.flatMap(c=>[1,3,5].map(k=>parseInt(c.slice(k,k+2),16)/255));
    gl.uniform3fv(this.loc(program,'u_colors[0]'),colors);gl.drawArrays(gl.TRIANGLES,0,3);
  }
  destroy(){
    const gl=this.gl;gl.deleteProgram(this.program);if(this.stepProgram)gl.deleteProgram(this.stepProgram);
    this.textures.forEach(t=>gl.deleteTexture(t));this.framebuffers.forEach(f=>gl.deleteFramebuffer(f));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
