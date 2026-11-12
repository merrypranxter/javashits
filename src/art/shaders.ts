export const vertex = `#version 300 es
precision highp float;
void main(){ vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2)); gl_Position=vec4(p*2.-1.,0.,1.); }`;
const common = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_phase,u_seed;
uniform vec4 u_p;
uniform vec3 u_pointer;
uniform int u_palette;
uniform vec3 u_colors[5];
uniform sampler2D u_state;
out vec4 outColor;
#define PI 3.14159265359
#define TAU 6.28318530718
vec2 uv(){return (gl_FragCoord.xy-.5*u_resolution)/min(u_resolution.x,u_resolution.y);}
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7))+u_seed)*43758.5453); }
vec2 hash2(vec2 p){return vec2(hash(p),hash(p+39.17));}
float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=mat2(1.6,1.2,-1.2,1.6)*p;a*=.5;}return v;}
vec3 palette(float t){t=fract(t)*4.;int i=int(floor(t));return mix(u_colors[i],u_colors[min(i+1,4)],smoothstep(0.,1.,fract(t)));}
vec3 spectrum(float x){return .5+.5*cos(TAU*(x+vec3(0.,.33,.67)));}
vec3 pigment(float t){return u_palette==0?spectrum(t):palette(t);}
mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
vec3 finish(vec3 c,vec2 q){c*=1.-.19*dot(q,q);return pow(max(c,0.),vec3(.9));}
`;
const membrane = `
vec3 cells(vec2 q){
 vec2 id=floor(q);vec2 f=fract(q);float d1=10.,d2=10.,key=0.;
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
  vec2 g=vec2(x,y),h=hash2(id+g);
  vec2 r=g+.5+.33*sin(TAU*h+u_phase+vec2(0,1.8))-f;
  float d=dot(r,r);if(d<d1){d2=d1;d1=d;key=h.x;}else{d2=min(d2,d);}
 }
 return vec3(sqrt(d1),sqrt(d2)-sqrt(d1),key);
}
void main(){
 vec2 q=uv(),p=q*u_p.z;
 vec2 drift=vec2(cos(u_phase),sin(u_phase));
 p+=u_p.y*1.3*vec2(sin(p.y*1.65+drift.x),cos(p.x*1.4+drift.y));
 p+=.2*vec2(sin(p.y*3.7+drift.y),cos(p.x*3.2+drift.x));
 if(u_pointer.z>0.)p+=.7*exp(-dot(q-u_pointer.xy,q-u_pointer.xy)*8.)*vec2(sin(p.y*3.),cos(p.x*3.));
 vec3 c=cells(p);
 float dome=sqrt(max(0.,1.-c.x*c.x*.85));
 float flow=fbm(p*1.2+drift*.3);
 float film=(dome*.9+flow*.55+c.z*.18);
 film+=u_p.w*.12*sin(16.*c.x+flow*9.+drift.x);
 float optical=film*(2.+u_p.x*10.);
 vec3 col=pigment(optical*.18+c.z*.3);
 vec2 grad=vec2(dFdx(film),dFdy(film))*min(u_resolution.x,u_resolution.y)/u_p.z;
 vec3 n=normalize(vec3(-grad*1.8,1.));
 float lit=.23+.77*abs(dot(n,normalize(vec3(-.5,.8,1.))));
 float edge=exp(-c.y*29.);
 float fine=.5+.5*cos(optical*TAU*3.);
 col*=lit*(.35+.65*dome)+.08*fine;
 col+=pigment(optical*.18+.35)*pow(fine,14.)*.12;
 col+=vec3(.72,.91,1.)*pow(max(dot(n,normalize(vec3(-.5,.7,1.))),0.),38.)*.7;
 col=mix(col,pigment(c.z+optical*.06)*1.15,edge*.6);
 col+=vec3(.55,.7,.8)*pow(edge,7.)*.48;
 col+=spectrum(optical*.08)*exp(-c.y*85.)*.8;
 outColor=vec4(finish(col,q),1.);
}`;
const quasi = `
void main(){
 vec2 q=uv(),p=q*2.;float f=0.,g=0.,h=0.;
 for(int i=0;i<13;i++){if(float(i)>=u_p.x)break;
  float a=PI*float(i)/u_p.x;vec2 dir=vec2(cos(a),sin(a));
  float phase=sin(u_phase+a*2.)*.8+dot(u_pointer.xy,dir)*3.;
  float w=dot(p,dir)*u_p.y;
  f+=cos(w+phase);g+=cos(w*1.618-phase)*u_p.w;h+=sin(w*.618+phase);
 }
 f/=sqrt(u_p.x);g/=sqrt(u_p.x);h/=sqrt(u_p.x);
 float v=f+g*.6;float edge=abs(sin(v*4.5+u_p.z*3.));
 float terrace=floor((v+3.)*(2.+u_p.z*3.))/(2.+u_p.z*3.);
 vec3 col=pigment(terrace*.28+h*.14+.3);
 float facet=smoothstep(u_p.z-.25,u_p.z+.25,abs(v));
 col*=.18+.65*facet;col+=pigment(h*.18+.8)*pow(1.-edge,12.)*.7;
 float seams=abs(fract((v+3.)*(2.+u_p.z*3.))-.5);col+=pigment(h*.2+.2)*smoothstep(.45,.49,seams)*.35;
 vec3 n=normalize(vec3(dFdx(v)*-80.,dFdy(v)*-80.,1.));
 col+=pow(max(dot(n,normalize(vec3(.4,.6,1.))),0.),30.)*.6;
 col+=vec3(.8,1.,.88)*pow(1.-edge,70.)*.45;
 outColor=vec4(finish(col,q),1.);
}`;
const ferro = `
float field(vec2 p){
 p*=u_p.y;
 vec2 a=mod(p,vec2(1.732,1.))-.5*vec2(1.732,1.);
 vec2 b=mod(p-vec2(.866,.5),vec2(1.732,1.))-.5*vec2(1.732,1.);
 float d=min(length(a),length(b));
 float tip=exp(-d*d*(6.+u_p.z*4.));
 float undulation=.5+.5*sin(p.x*.7+sin(u_phase)) *cos(p.y*.5+cos(u_phase));
 return -.6+tip*u_p.x*(.65+undulation*.3)+.025*sin(p.x*2.+u_phase)*sin(p.y*2.-u_phase);
}
float map(vec3 p){return (p.y-field(p.xz))*.055;}
vec3 environment(vec3 r){
 float bands=pow(.5+.5*sin(r.x*6.+r.z*4.+sin(u_phase)),5.);
 vec3 c=mix(vec3(.035,.045,.07),pigment(r.y*.5+r.x*.2+.6)*.9,u_p.w);
 c+=vec3(.9,.96,1.)*pow(max(dot(r,normalize(vec3(-.5,1.,.2))),0.),10.)*2.;
 c+=vec3(.85,.95,1.)*pow(max(0.,1.-abs(r.y-.35)*6.),3.)*.9;
 c+=pigment(r.z*.4+.2)*bands*.7;return c;
}
void main(){
 vec2 q=uv();float ang=.55+u_pointer.x*2.;
 vec3 ro=vec3(sin(ang)*2.5,4.5+u_pointer.y,cos(ang)*2.5);
 vec3 ta=vec3(0,-.1,0);vec3 ww=normalize(ta-ro),uu=normalize(cross(ww,vec3(0,1,0))),vv=cross(uu,ww);
 vec3 rd=normalize(uu*q.x+vv*q.y+ww*1.45);
 float t=0.;vec3 pos;bool hit=false;
 for(int i=0;i<200;i++){pos=ro+rd*t;float d=map(pos);if(d<.0007){hit=true;break;}t+=max(d,.001);if(t>12.)break;}
 vec3 col=vec3(.014,.018,.027);
 if(hit){float e=.003;vec3 n=normalize(vec3(field(pos.xz-vec2(e,0))-field(pos.xz+vec2(e,0)),2.*e,field(pos.xz-vec2(0,e))-field(pos.xz+vec2(0,e))));
  float fres=pow(1.-max(dot(n,-rd),0.),3.);
  vec3 ref=environment(reflect(rd,n));
  float diff=max(dot(n,normalize(vec3(-.4,1.,.6))),0.);
  col=ref*(.5+fres*.7)+pigment(pos.y*.38+.45)*diff*.15;
  col+=vec3(.8,.95,1.)*pow(max(dot(n,normalize(vec3(-.5,1.,.6))-rd),0.)*.5,40.)*.2;
  col*=exp(-t*.035);
 }
 outColor=vec4(finish(col,q),1.);
}`;
const gyroid = `
float shape(vec3 p){
 vec3 q=p*u_p.y;
 q+=u_p.z*vec3(sin(q.y+sin(u_phase)),sin(q.z+cos(u_phase)),sin(q.x+sin(u_phase+1.)));
 float g=dot(sin(q),cos(q.yzx));
 float surface=(abs(g)-u_p.x)/u_p.y*.34;
 float sphere=length(p)-u_p.w;
 return max(surface,sphere);
}
vec3 normalAt(vec3 p){vec2 e=vec2(.002,0);return normalize(vec3(shape(p+e.xyy)-shape(p-e.xyy),shape(p+e.yxy)-shape(p-e.yxy),shape(p+e.yyx)-shape(p-e.yyx)));}
void main(){
 vec2 q=uv();float a=.35+sin(u_phase)*.16+u_pointer.x*3.;
 vec3 ro=vec3(sin(a)*5.3,1.4+u_pointer.y*2.,cos(a)*5.3),ta=vec3(0);
 vec3 ww=normalize(ta-ro),uu=normalize(cross(ww,vec3(0,1,0))),vv=cross(uu,ww);
 vec3 rd=normalize(uu*q.x+vv*q.y+ww*1.2);
 float t=0.;bool hit=false;vec3 pos;
 for(int i=0;i<108;i++){pos=ro+rd*t;float d=shape(pos);if(d<.002){hit=true;break;}t+=max(d,.001);if(t>10.)break;}
 vec3 col=vec3(.015,.019,.028);
 if(hit){
  vec3 n=normalAt(pos);vec3 l=normalize(vec3(-.7,.9,1.));float diff=max(dot(n,l),0.);
  float ao=clamp(shape(pos+n*.12)/.12,.1,1.);
  float fres=pow(1.-max(dot(n,-rd),0.),2.);
  vec3 base=pigment(pos.x*.17+pos.y*.16+pos.z*.08+n.x*.18+.6);
  col=base*(.25+.65*diff)*ao;
  col+=pigment(n.y*.4+pos.z*.1+.3)*fres*.65;
  col+=vec3(.8,.93,1.)*pow(max(dot(n,normalize(l-rd)),0.),70.)*1.3;
  col+=vec3(.01,.08,.12)*(1.-ao);
 }
 outColor=vec4(finish(col,q),1.);
}`;
const diffraction = `
void main(){
 vec2 q=uv();vec2 p=q*4.5;vec3 intensity=vec3(0.);
 for(int s=0;s<3;s++){
  float wave=1.+(float(s)-1.)*u_p.z;
  vec2 amp=vec2(0.);
  for(int i=0;i<24;i++){if(float(i)>=u_p.x)break;
   float a=TAU*float(i)/u_p.x;
   vec2 aperture=vec2(cos(a),sin(a));
   aperture.x+=u_pointer.x*aperture.y*.7;aperture.y+=u_pointer.y*aperture.x*.7;
   float ph=dot(p,aperture)*u_p.y/wave+u_p.w*sin(float(i)*2.399+u_seed*.01+sin(u_phase)) *4.;
   ph+=sin(u_phase)*cos(a*3.)*.5;
   amp+=vec2(cos(ph),sin(ph));
  }
  float v=dot(amp,amp)/u_p.x;
  float env=exp(-dot(p,p)*.024);
  intensity[s]=pow(v,.65)*env;
 }
 float total=dot(intensity,vec3(.333));
 vec3 col=intensity*.33;
 if(u_palette>0)col=mix(col,palette(total*.24)*total*.6,.8);
 float r=length(p);col+=pigment(r*.13)*pow(max(0.,sin(r*u_p.y*1.7)),28.)*.04;
 col=1.-exp(-col*1.5);
 outColor=vec4(finish(col,q),1.);
}`;
const reaction = `
vec2 chem(vec2 v){vec4 c=texture(u_state,v);return vec2(c.r+c.g/255.,c.b+c.a/255.);}
void main(){
 vec2 st=gl_FragCoord.xy/u_resolution,px=1./vec2(textureSize(u_state,0));
 vec2 c=chem(st);float v=c.y;
 float dx=chem(st+vec2(px.x,0)).y-chem(st-vec2(px.x,0)).y;
 float dy=chem(st+vec2(0,px.y)).y-chem(st-vec2(0,px.y)).y;
 vec3 n=normalize(vec3(-dx*u_p.w*14.,-dy*u_p.w*14.,.8));
 float lit=.25+.75*max(dot(n,normalize(vec3(-.5,.7,1.))),0.);
 vec3 col=pigment(v*2.4+c.x*.35+.25)*lit;
 col*=smoothstep(.015,.15,v)*.9+.08;
 col+=pow(max(dot(n,normalize(vec3(-.4,.5,1.))),0.),40.)*.55;
 float edge=length(vec2(dx,dy));col+=pigment(v*2.+.5)*edge*.8;
 outColor=vec4(finish(col,uv()),1.);
}`;
const excitable = `
float cell(vec2 s){return floor(texture(u_state,s).r*255.+.5);}
void main(){
 vec2 st=gl_FragCoord.xy/u_resolution;vec2 px=1./vec2(textureSize(u_state,0));
 float c=cell(st),v=c/u_p.x;
 float e=step(.5,abs(c-cell(st+vec2(px.x,0))))+step(.5,abs(c-cell(st+vec2(0,px.y))));
 vec3 col=pigment(v*.86+.05);
 col*=mix(1.,.32,e*.5*u_p.w);
 col+=pow(1.-e*.5,6.)*.1;
 outColor=vec4(finish(col,uv()),1.);
}`;
export const shaders: Record<string,string> = Object.fromEntries(Object.entries({membrane,quasi,ferro,gyroid,diffraction,reaction,excitable}).map(([id,body])=>[id,common+body]));
const simulationHead = `#version 300 es
precision highp float;
uniform sampler2D u_state;
uniform vec4 u_p;
uniform vec3 u_pointer;
uniform float u_seed;
out vec4 outColor;
vec2 decode(vec4 c){return vec2(c.r+c.g/255.,c.b+c.a/255.);}
vec4 encode(vec2 c){vec2 a=floor(clamp(c,0.,1.)*255.)/255.;vec2 b=fract(clamp(c,0.,1.)*255.);return vec4(a.x,b.x,a.y,b.y);}
`;
export const reactionStep=simulationHead+`
void main(){
 ivec2 sz=textureSize(u_state,0),xy=ivec2(gl_FragCoord.xy);vec2 texel=1./vec2(sz),st=gl_FragCoord.xy*texel;
 vec2 c=decode(texture(u_state,st));vec2 lap=-c;
 lap+=.2*(decode(texture(u_state,st+vec2(texel.x,0)))+decode(texture(u_state,st-vec2(texel.x,0)))+decode(texture(u_state,st+vec2(0,texel.y)))+decode(texture(u_state,st-vec2(0,texel.y))));
 lap+=.05*(decode(texture(u_state,st+texel))+decode(texture(u_state,st-texel))+decode(texture(u_state,st+vec2(texel.x,-texel.y)))+decode(texture(u_state,st+vec2(-texel.x,texel.y))));
 float r=c.x*c.y*c.y;
 vec2 next=c+vec2(lap.x-r+u_p.x*(1.-c.x),lap.y*u_p.z+r-(u_p.y+u_p.x)*c.y);
 if(u_pointer.z>0. && distance(st-.5,u_pointer.xy)<.025)next=vec2(.1,.9);
 outColor=encode(next);
}`;
export const excitableStep=simulationHead+`
void main(){
 vec2 px=1./vec2(textureSize(u_state,0)),st=gl_FragCoord.xy*px;
 float state=floor(texture(u_state,st).r*255.+.5),target=mod(state+1.,u_p.x);int neighbors=0;
 for(int y=-3;y<=3;y++)for(int x=-3;x<=3;x++){
  if((x==0&&y==0)||abs(float(x))>u_p.z||abs(float(y))>u_p.z)continue;
  float n=floor(texture(u_state,st+vec2(x,y)*px).r*255.+.5);
  if(abs(n-target)<.5)neighbors++;
 }
 if(float(neighbors)>=u_p.y)state=target;
 if(u_pointer.z>0.&&distance(st-.5,u_pointer.xy)<.025)state=mod(floor((st.x+st.y)*90.)+u_seed,u_p.x);
 outColor=vec4(state/255.,0.,0.,1.);
}`;
