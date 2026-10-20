import { useEffect, useRef, useState } from 'react';
import { Film, Loader2 } from 'lucide-react';
import useExerciseMedia from '../hooks/useExerciseMedia';

function MediaView({ media, loading, name, large }) {
  const video=useRef(null);
  const [failed,setFailed]=useState(false);
  const [videoFailed,setVideoFailed]=useState(false);
  const [reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{setFailed(false);setVideoFailed(false);},[media]);
  useEffect(()=>{
    const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>setReduced(preference.matches);preference.addEventListener('change',update);
    return()=>preference.removeEventListener('change',update);
  },[]);
  useEffect(()=>{
    const element=video.current;
    if(!element || reduced) return;
    const observer=new IntersectionObserver(entries=>{if(entries[0].isIntersecting)element.play().catch(()=>{});else element.pause();},{threshold:.2});
    observer.observe(element);return()=>observer.disconnect();
  },[media,reduced,failed,videoFailed]);
  const image=large ? media?.image || media?.thumbnail : media?.thumbnail || media?.image;
  const gif=!reduced ? media?.gif : null;
  const available = !failed && ((!videoFailed && media?.video && !reduced) || gif || image);
  const wrapper=large ? 'relative flex h-56 w-full items-center justify-center overflow-hidden rounded-2xl border border-white/5 bg-[#151a20]' : 'relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-[#1c232c]';
  return <span className={wrapper} role={large ? "group" : "img"} aria-label={loading ? `Loading ${name} demonstration` : available ? `${name} demonstration` : `No verified demonstration available for ${name}`}>
    {loading ? <Loader2 size={large ? 24:17} className="animate-spin text-gray-500" /> : !failed && !videoFailed && media?.video && !reduced ? <video ref={video} src={media.video} poster={image || undefined} loop muted playsInline preload="metadata" controls={large} onError={()=>setVideoFailed(true)} className="h-full w-full object-contain" aria-label={`${name} movement demonstration`} /> : !failed && (gif || image) ? <img src={gif || image} alt="" loading="lazy" onError={()=>setFailed(true)} className="h-full w-full object-contain" /> : <span className="flex flex-col items-center gap-2 px-1 text-center text-gray-500"><Film size={large ? 27:20}/>{large && <span className="text-xs leading-5">A verified demonstration is not available for this exact exercise.</span>}</span>}
  </span>;
}
export default function ExercisePreview({ exercise, large=false, media, loading }) {
  const resolved=useExerciseMedia(media !== undefined || loading !== undefined ? null : exercise);
  return <MediaView media={media === undefined ? resolved.media : media} loading={loading === undefined ? resolved.loading : loading} name={exercise?.name || 'Exercise'} large={large}/>;
}
