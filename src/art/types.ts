import type { Params } from './catalog';
import type { Pointer } from './math';
export interface Renderer {
  resize(width:number,height:number):void;
  render(phase:number,dt:number,params:Params,palette:number,pointer:Pointer):void;
  reset(seed:number,params:Params):void;
  destroy():void;
}
