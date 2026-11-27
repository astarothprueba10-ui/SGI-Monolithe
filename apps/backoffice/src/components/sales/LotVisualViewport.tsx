import { useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { MinusIcon, PlusIcon } from 'lucide-react';
import { clampVisualBox, fitVisualBox, zoomVisualBox, interpolateVisualBox, sameVisualBox, type VisualBox } from '../../lib/lotVisualFocus';

export function LotVisualViewport({full,focus,resetKey,children}:{full:VisualBox;focus:VisualBox|null;resetKey:string;children:(view:VisualBox)=>ReactNode}){
  const host=useRef<HTMLDivElement>(null);
  const drag=useRef<{id:number;x:number;y:number;view:VisualBox;inverse:DOMMatrix;moving:boolean}|null>(null);
  const suppressClick=useRef(false);
  const [aspect,setAspect]=useState(1.5);
  const [manual,setManual]=useState<{key:string;box:VisualBox}|null>(null);
  const animation=useRef<number|null>(null);
  const dragFrame=useRef<number|null>(null);
  const pendingDrag=useRef<VisualBox|null>(null);
  const [display,setDisplay]=useState<VisualBox|null>(null);
  const displayed=useRef<VisualBox|null>(null);
  const [dragging,setDragging]=useState(false);
  useLayoutEffect(()=>{
    const el=host.current;
    if(!el)return;
    const measure=()=>{
      if(el.clientWidth>0&&el.clientHeight>0)setAspect(el.clientWidth/el.clientHeight);
    };
    measure();
    if(typeof ResizeObserver==='undefined'){window.addEventListener('resize',measure);return ()=>window.removeEventListener('resize',measure);}
    const observer=new ResizeObserver(measure);
    observer.observe(el);
    return ()=>observer.disconnect();
  },[]);
  const limit=fitVisualBox(full,aspect);
  const initial=focus?clampVisualBox(limit,fitVisualBox(focus,aspect)):limit;
  const target=manual?.key===resetKey?clampVisualBox(limit,fitVisualBox(manual.box,aspect)):initial;
  const view=display?clampVisualBox(limit,fitVisualBox(display,aspect)):target;
  const scale=limit[2]/target[2];
  const [tx,ty,tw,th]=target;
  function stopAnimation(){if(animation.current!==null){cancelAnimationFrame(animation.current);animation.current=null;}}
  function show(box:VisualBox){displayed.current=box;setDisplay(box);}
  useLayoutEffect(()=>{
    stopAnimation();
    const next:VisualBox=[tx,ty,tw,th];
    const previous=displayed.current;
    if(!previous||sameVisualBox(previous,next)||drag.current?.moving||
      Math.abs(previous[2]/previous[3]-next[2]/next[3])>0.001||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){show(next);return;}
    const started=performance.now();
    const tick=(now:number)=>{
      const t=Math.min(1,(now-started)/220);
      show(interpolateVisualBox(previous,next,t));
      animation.current=t<1?requestAnimationFrame(tick):null;
    };
    animation.current=requestAnimationFrame(tick);
    return stopAnimation;
  },[tx,ty,tw,th]);
  useLayoutEffect(()=>()=>{stopAnimation();if(dragFrame.current!==null)cancelAnimationFrame(dragFrame.current);},[]);
  function zoom(factor:number){setManual({key:resetKey,box:zoomVisualBox(limit,target,factor)});}
  function down(e:PointerEvent<HTMLDivElement>){
    suppressClick.current=false;
    if(scale<=1.0001||e.button!==0||!e.isPrimary)return;
    const matrix=e.currentTarget.querySelector('svg')?.getScreenCTM();
    if(!matrix)return;
    drag.current={id:e.pointerId,x:e.clientX,y:e.clientY,view:[...view],inverse:matrix.inverse(),moving:false};
  }
  function move(e:PointerEvent<HTMLDivElement>){
    const d=drag.current;
    if(!d||d.id!==e.pointerId)return;
    if(!d.moving&&Math.hypot(e.clientX-d.x,e.clientY-d.y)<5)return;
    if(!d.moving){d.moving=true;suppressClick.current=true;stopAnimation();e.currentTarget.setPointerCapture(e.pointerId);setDragging(true);}
    const a=new DOMPoint(d.x,d.y).matrixTransform(d.inverse),c=new DOMPoint(e.clientX,e.clientY).matrixTransform(d.inverse);
    pendingDrag.current=clampVisualBox(limit,[d.view[0]+a.x-c.x,d.view[1]+a.y-c.y,d.view[2],d.view[3]]);
    if(dragFrame.current===null)dragFrame.current=requestAnimationFrame(()=>{
      dragFrame.current=null;const box=pendingDrag.current;pendingDrag.current=null;
      if(box){show(box);setManual({key:resetKey,box});}
    });
  }
  function end(e:PointerEvent<HTMLDivElement>){
    if(drag.current?.id!==e.pointerId)return;
    if(dragFrame.current!==null){cancelAnimationFrame(dragFrame.current);dragFrame.current=null;}
    const box=pendingDrag.current;pendingDrag.current=null;
    if(box){show(box);setManual({key:resetKey,box});}
    drag.current=null;setDragging(false);
    if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
  }
  const btn='inline-flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-md border border-brand-200 bg-white text-brand-800 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40';
  return <div className="min-w-0 space-y-2">
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2" role="group" aria-label="Zoom del plano">
        <button type="button" className={btn} aria-label="Reducir zoom" title="Reducir zoom" disabled={scale<=1.0001} onClick={()=>zoom(1/1.35)}><MinusIcon className="h-4 w-4"/></button>
        <span className="min-w-[52px] text-center text-xs font-semibold tabular-nums text-brand-700">{Math.round(scale*100)}%</span>
        <button type="button" className={btn} aria-label="Ampliar zoom" title="Ampliar zoom" disabled={scale>=23.999} onClick={()=>zoom(1.35)}><PlusIcon className="h-4 w-4"/></button>
      </div>
      <span className="text-right text-[11px] text-brand-500">Arrastra el plano ampliado</span>
    </div>
    <div ref={host} className={`h-[clamp(240px,40dvh,380px)] lg:h-[clamp(280px,43dvh,440px)] w-full overflow-hidden rounded-lg border border-brand-100 bg-brand-50 ${dragging?'cursor-grabbing':scale>1.0001?'cursor-grab':''}`}
      style={{touchAction:scale>1.0001?'none':'auto',userSelect:'none'}}
      onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
      onPointerLeave={e=>{if(!drag.current?.moving)end(e);}}
      onClickCapture={e=>{if(suppressClick.current&&e.detail!==0){e.stopPropagation();suppressClick.current=false;}}}>
      {children(view)}
    </div>
  </div>;
}
