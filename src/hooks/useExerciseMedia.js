import { useEffect, useState } from 'react';
import { resolveExerciseMedia } from '../lib/exerciseMedia';
export default function useExerciseMedia(exercise) {
  const [media,setMedia]=useState(null);
  const [loading,setLoading]=useState(true);
  const [attempt,setAttempt]=useState(0);
  const name=exercise?.name || '';
  const equipment=JSON.stringify(exercise?.equipments || (exercise?.equipment ? [exercise.equipment] : []));
  useEffect(()=>{
    let active=true;setMedia(null);setLoading(true);
    if(!name) {setLoading(false);return;}
    resolveExerciseMedia({name,equipments:JSON.parse(equipment)}).then(value=>{if(active)setMedia(value);}).catch(()=>{if(active)setMedia(null);}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[name,equipment,attempt]);
  return {media,loading,retry:()=>setAttempt(value=>value+1)};
}
