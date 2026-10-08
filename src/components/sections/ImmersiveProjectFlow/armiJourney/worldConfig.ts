import { CatmullRomCurve3, Vector3 } from "three";

export const spatialCurve=(points:number[][])=>new CatmullRomCurve3(points.map(p=>new Vector3(...p as [number,number,number])),false,"centripetal");
/** Composition units only: these are not ARMI hardware dimensions. */
export const districtConfig=[
  {name:"TEXT ANSWER",position:[-20,10,-68],color:"#e9b977",shape:"ordered response terraces"},
  {name:"TAVILY SEARCH",position:[26,6,-75],color:"#79cbdc",shape:"wide horizontal source array"},
  {name:"MEMORY RETRIEVAL",position:[18,15,-71],color:"#e8be7a",shape:"stacked archive cells"},
  {name:"ROBOT ACTION",position:[-22,-5,-61],color:"#d8a873",shape:"articulated action bay"},
] as const;
export const worldRoutes=[
  spatialCurve([[0,5,-44],[9,2,-39],[-4,2,-54],[-20,10,-68]]),
  spatialCurve([[0,5,-44],[12,4,-49],[20,3,-62],[26,6,-75]]),
  spatialCurve([[0,5,-44],[8,10,-53],[13,14,-60],[18,15,-71]]),
  spatialCurve([[0,5,-44],[-12,0,-46],[-18,-3,-55],[-22,-5,-61]]),
];
export const frameComposition=[
  {id:"entry",progress:0,subject:"actual Tablet",occupancy:.55,foreground:.12,density:"low",fov:43,light:"original UI",destination:"product surface"},
  {id:"portal",progress:.235,subject:"product aperture",occupancy:.8,foreground:.2,density:"medium",fov:43,light:"UI and aperture edge",destination:"transcription layers"},
  {id:"understand",progress:.378,subject:"six transcription layers",occupancy:.48,foreground:.12,density:"medium",fov:46,light:"white layer edges",destination:"structured request at right"},
  {id:"routing",progress:.56,subject:"small request inside system atrium",occupancy:.1,foreground:.2,density:"high",fov:56,light:"cyan vertical shaft and warm districts",destination:"four distinct districts"},
  {id:"decision",progress:.675,subject:"one activated S-shaped service bridge",occupancy:.4,foreground:.25,density:"high",fov:50,light:"sequential lime route",destination:"Text Answer upper left"},
  {id:"travel",progress:.78,subject:"selected bridge through infrastructure",occupancy:.4,foreground:.3,density:"highest",fov:48,light:"lime rail, warm supports",destination:"response chamber ahead"},
  {id:"result",progress:.885,subject:"aligned response layers",occupancy:.35,foreground:.08,density:"low",fov:42,light:"warm/lime response, overhead cyan",destination:"same product surface"},
  {id:"return",progress:.994,subject:"original conversation mode",occupancy:.55,foreground:.12,density:"low",fov:43,light:"actual Tablet UI",destination:"existing Brief"},
] as const;
