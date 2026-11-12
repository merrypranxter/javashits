import type {Experiment,Params} from './catalog';
import {createCanvasRenderer} from './canvas';
import {GLRenderer} from './webgl';
import type {Renderer} from './types';
export function createRenderer(canvas:HTMLCanvasElement,experiment:Experiment,seed:number,params:Params):Renderer{
  return ['caustic','loom','mycelium','crystal','attractor'].includes(experiment.id)
    ?createCanvasRenderer(canvas,experiment,seed,params):new GLRenderer(canvas,experiment,seed,params);
}
