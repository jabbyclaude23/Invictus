import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
export async function finishPlanningTask(uid,id,day) {
  const taskRef=doc(db,'users',uid,'todos',id),planRef=doc(db,'users',uid,'daily_checkins',day),focusRef=doc(db,'users',uid,'focus_session','current');
  return runTransaction(db,async transaction=>{
    const task=await transaction.get(taskRef),plan=await transaction.get(planRef),focus=await transaction.get(focusRef);
    if(!task.exists())throw new Error('This task no longer exists.');
    const ids=plan.data()?.taskIds||[];
    const selected=await Promise.all(ids.map(taskId=>transaction.get(doc(db,'users',uid,'todos',taskId))));
    transaction.update(taskRef,{done:true,completedOn:day,completedAt:new Date()});
    if(focus.data()?.taskId===id)transaction.delete(focusRef);
    if(ids.includes(id))transaction.set(planRef,{priorities:selected.filter(item=>item.exists()).map(item=>({text:item.data().text,done:item.id===id||Boolean(item.data().done)})),updatedAt:new Date()},{merge:true});
  });
}
