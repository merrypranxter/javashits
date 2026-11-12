export type Parameter = { key: string; label: string; min: number; max: number; step: number; value: number; hint: string };
export type Experiment = {
  id: string; name: string; principle: string; engine: string; description: string;
  interaction: string; periodic: boolean; parameters: Parameter[];
};
const p = (key: string, label: string, min: number, max: number, step: number, value: number, hint: string): Parameter => ({key,label,min,max,step,value,hint});
export const experiments: Experiment[] = [
  { id: 'membrane', name: 'Iridescent membranes', principle: 'Thin-film interference', engine: 'WebGL · optical field', periodic: true,
    description: 'Light takes two paths through a liquid film. Their phase difference splits the surface into spectral bands. A warped cellular thickness field folds the film into wet, luminous membranes.',
    interaction: 'Drag across the surface to disturb the film.', parameters: [
      p('thickness','Film thickness',0.15,1.8,0.01,0.62,'Optical path length: more thickness creates more interference fringes.'),
      p('tension','Surface tension',0,1,0.01,0.45,'Changes the curvature and stretching of the cellular film.'),
      p('density','Cell density',2,12,0.1,5.2,'Changes how many chambers compete for the surface.'),
      p('refraction','Refraction',0,1,0.01,0.72,'Bends the thickness field through its own surface gradient.') ] },
  { id: 'reaction', name: 'Chemical garden', principle: 'Reaction–diffusion', engine: 'WebGL · Gray–Scott simulation', periodic: false,
    description: 'Two chemicals diffuse at different rates while one consumes the other. Feed and kill rates decide whether the colony becomes coral, fingerprints, dividing cells, or an extinct world.',
    interaction: 'Draw to inject the second chemical. Give it time to grow.', parameters: [
      p('feed','Nutrient feed',0.012,0.08,0.001,0.036,'Replenishes chemical A; changes pattern topology.'),
      p('kill','Chemical decay',0.045,0.072,0.001,0.062,'Removes chemical B; competes with the feed rate.'),
      p('diffusion','Diffusion ratio',0.25,0.8,0.01,0.5,'Diffusion of B relative to A. Changes the size and stability of structures.'),
      p('relief','Surface relief',0,2,0.01,0.9,'Reconstructs a lit material from the concentration gradient.') ] },
  { id: 'caustic', name: 'Photon caustics', principle: 'Refractive light transport', engine: 'Canvas 2D · forward ray splatting', periodic: true,
    description: 'A dense sheet of light rays passes through rippling glass. Surface slopes redirect the rays; where they converge, bright caustic cusps emerge. Red, green, and blue rays bend differently.',
    interaction: 'Drag to move the lens disturbance through the glass.', parameters: [
      p('depth','Receiver depth',0.1,2.4,0.01,1.05,'Distance after the glass: rays travel farther before they land.'),
      p('curvature','Lens curvature',0.1,1.6,0.01,0.85,'Strength of the refractive surface slopes.'),
      p('dispersion','Spectral dispersion',0,0.8,0.01,0.28,'Separates the focal paths of the three spectral bands.'),
      p('ripples','Wave components',2,9,1,5,'Number of intersecting surface waves shaping the lens.') ] },
  { id: 'ferro', name: 'Ferrofluid cathedral', principle: 'Magnetic potential', engine: 'WebGL · ray-marched height field', periodic: true,
    description: 'A metallic liquid rises beneath a lattice of magnetic poles. A Rosensweig-inspired height field turns field strength and pole spacing into an architecture of liquid spires.',
    interaction: 'Drag to tilt the magnetic landscape.', parameters: [
      p('field','Magnetic field',0.1,1.5,0.01,0.86,'Raises and sharpens the field-induced peaks.'),
      p('spacing','Pole density',2,7,0.1,2.8,'Changes the spacing of the hexagonal magnetic pole lattice.'),
      p('sharpness','Tip instability',1,8,0.1,3.4,'Controls how abruptly liquid gathers at the magnetic poles.'),
      p('metal','Spectral reflectance',0,1,0.01,0.8,'Mixes metallic reflections with interference coloration.') ] },
  { id: 'quasi', name: 'Quasicrystal', principle: 'Aperiodic wave order', engine: 'WebGL · superposed plane waves', periodic: true,
    description: 'Standing waves at incompatible angles form long-range order that never repeats. Change the symmetry and the entire lattice reorganizes into nested stars, rosettes, and impossible mosaics.',
    interaction: 'Drag to slip the phases between the wave families.', parameters: [
      p('symmetry','Rotational symmetry',4,13,1,7,'Number of wave directions. Odd orders create aperiodic order.'),
      p('frequency','Wave frequency',5,38,0.1,24,'Sets the spacing between wavefronts.'),
      p('threshold','Crystal threshold',0.15,1.3,0.01,0.65,'Cuts facets out of the summed wave amplitude.'),
      p('harmonics','Harmonic coupling',0,1,0.01,0.58,'Adds a second incompatible wavelength to split the lattice.') ] },
  { id: 'loom', name: 'Chromatic loom', principle: 'Woven differential curves', engine: 'Canvas 2D · over–under geometry', periodic: true,
    description: 'Two families of curved threads cross according to a weave matrix. Every crossing has a real over–under order, highlights, and a contact shadow. Small geometric shifts produce huge moiré structures.',
    interaction: 'Drag to pull the threads out of alignment.', parameters: [
      p('threads','Thread count',16,70,1,38,'Changes the actual number of warp and weft threads.'),
      p('bend','Thread deflection',0,1.5,0.01,0.8,'Amplitude of the curves that deform the textile.'),
      p('weave','Twill repeat',1,7,1,3,'Number of crossings before a thread passes underneath.'),
      p('filament','Filament width',0.15,0.95,0.01,0.62,'Thread width relative to spacing; reveals or closes the gaps.') ] },
  { id: 'mycelium', name: 'Mycelium circuit', principle: 'Space colonization', engine: 'Canvas 2D · competitive branching', periodic: false,
    description: 'A branching organism reaches toward scattered nutrients. Each nutrient recruits its nearest tip, while exhausted regions stop growing. Veins thicken as the living network discovers its territory.',
    interaction: 'Touch to plant a new nutrient-rich growth site.', parameters: [
      p('reach','Attraction radius',0.06,0.4,0.01,0.15,'How far a nutrient can influence a growing branch.'),
      p('competition','Consumption radius',0.004,0.04,0.001,0.008,'Distance at which a nutrient is consumed; larger values prune the network.'),
      p('branching','Branch persistence',0.1,1.5,0.01,0.62,'Balances previous direction against the competing nutrients.'),
      p('nutrients','Nutrient sites',400,3000,50,1800,'Re-seeds the field with this many targets when changed.') ] },
  { id: 'crystal', name: 'Crystal accretion', principle: 'Hexagonal cellular growth', engine: 'Canvas 2D · diffusion & deposition', periodic: false,
    description: 'Vapor diffuses across a hexagonal lattice and freezes onto a growing seed. Local vapor supply and attachment thresholds build crystalline arms, serrated plates, and dendritic fractures.',
    interaction: 'Touch to add a crystal seed to the vapor field.', parameters: [
      p('vapor','Vapor saturation',0.2,1,0.01,0.64,'The reservoir of material available to condense.'),
      p('attachment','Attachment threshold',0.35,1.5,0.01,0.88,'How much accumulated vapor a boundary cell needs to freeze.'),
      p('anisotropy','Branch anisotropy',0,1,0.01,0.65,'Favors exposed tips over flat facets to form dendrites.'),
      p('lattice','Lattice scale',0.65,1.5,0.01,1.1,'Magnifies the discrete hexagonal structure of the crystal.') ] },
  { id: 'gyroid', name: 'Elastic topology', principle: 'Triply periodic surfaces', engine: 'WebGL · implicit-surface ray marching', periodic: true,
    description: 'A gyroid divides space into two interlocking labyrinths without a straight line. Slicing through its implicit equation reveals a porous material with continuous, impossible-looking tunnels.',
    interaction: 'Drag to travel around the interlocking labyrinth.', parameters: [
      p('porosity','Porosity',0.06,0.75,0.01,0.23,'Thickness of the gyroid wall; closes or opens the tunnels.'),
      p('frequency','Unit-cell density',1.2,4.5,0.01,2.5,'Number of repeating 3D cells inside the specimen.'),
      p('stress','Elastic strain',0,1.2,0.01,0.32,'Warps the coordinates before evaluating the implicit surface.'),
      p('cut','Section depth',0.6,2.8,0.01,1.9,'Cuts the specimen with a bounding volume to expose its internal topology.') ] },
  { id: 'attractor', name: 'Strange attractor', principle: 'Chaotic recurrence', engine: 'Canvas 2D · Clifford density accumulation', periodic: false,
    description: 'One point repeatedly maps its position through coupled sine and cosine equations. Millions of visits collect into a density map: delicate ribbons, folded wings, and luminous structures made entirely of recurrence.',
    interaction: 'Touch to perturb the orbit. Mutate to discover another basin.', parameters: [
      p('a','X feedback · a',-3,3,0.001,-1.4,'Frequency of y in the next x coordinate.'),
      p('b','Y feedback · b',-3,3,0.001,1.6,'Frequency of x in the next y coordinate.'),
      p('c','X coupling · c',-2,2,0.001,1,'Strength of the cosine term in the next x.'),
      p('d','Y coupling · d',-2,2,0.001,0.7,'Strength of the cosine term in the next y.') ] },
  { id: 'excitable', name: 'Excitable matter', principle: 'Cyclic cellular automata', engine: 'WebGL · discrete neighborhood rule', periodic: false,
    description: 'Each cell has one obsession: become the next state in a color cycle. It can only advance when enough neighbors have already made the leap. Local rules organize into spirals, wavefronts, and competing colonies.',
    interaction: 'Draw to disrupt the local phase and trigger new wavefronts.', parameters: [
      p('states','Chemical states',4,16,1,9,'Length of the cyclic state chain. Re-seeds the world when changed.'),
      p('threshold','Excitation threshold',1,5,1,2,'Number of next-state neighbors required for a cell to advance.'),
      p('radius','Neighborhood radius',1,3,1,1,'Reach of the local interaction rule.'),
      p('contours','Membrane contrast',0,1,0.01,0.65,'Emphasizes boundaries between neighboring phases.') ] },
  { id: 'diffraction', name: 'Diffraction atlas', principle: 'Fraunhofer interference', engine: 'WebGL · complex wave amplitudes', periodic: true,
    description: 'A ring of apertures sends coherent light toward a distant screen. Complex amplitudes add before intensity is measured. Aperture geometry and spectral bandwidth determine the diffraction structure.',
    interaction: 'Drag to shear the aperture geometry.', parameters: [
      p('apertures','Aperture count',3,24,1,9,'Number of coherent sources in the aperture ring.'),
      p('spacing','Aperture separation',2,14,0.1,6.4,'Changes phase differences and the spacing of diffraction fringes.'),
      p('bandwidth','Spectral bandwidth',0.01,0.65,0.01,0.3,'Difference between the sampled wavelengths; separates spectral orders.'),
      p('coherence','Aperture disorder',0,1.5,0.01,0.15,'Adds individual phase delays and breaks perfect coherence.') ] },
];
export type Params = Record<string, number>;
export function defaults(experiment: Experiment): Params { return Object.fromEntries(experiment.parameters.map(p=>[p.key,p.value])); }
export const palettes = [
  {name:'Oil slick', colors:['#fa2bbe','#ff8c24','#d6ff57','#12e2df','#4655ff']},
  {name:'Toxic orchid', colors:['#160d40','#7129ff','#ff33c9','#d4ff2b','#eaffaf']},
  {name:'Abyssal candy', colors:['#100e3c','#314cff','#00e4ee','#f353d9','#ffe5fd']},
  {name:'Solar bruise', colors:['#25084a','#ab175c','#ff4c22','#ffc72d','#fcf4bd']},
  {name:'Alien mineral', colors:['#052a30','#147d72','#7fffbe','#9a65ff','#edc4ff']},
];
export const initialSeed = 74281;
