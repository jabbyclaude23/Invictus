export function normalizeGoalPlan(value) {
  if (!Array.isArray(value?.milestones) || !value.milestones.length) throw new Error('Coach returned no milestones. Try again or add a step manually.');
  return value.milestones.slice(0, 6).map((milestone, i) => ({
    id: 'milestone-' + i, title: String(milestone.title || '').trim().slice(0,180),
    tasks: (Array.isArray(milestone.tasks) ? milestone.tasks : []).slice(0,8).map(task => ({
      text: String(task.text || '').trim().slice(0,240), estimateMinutes: Math.max(5, Math.min(240, Number(task.estimateMinutes)||25)),
    })).filter(task => task.text),
  })).filter(milestone => milestone.title && milestone.tasks.length);
}
