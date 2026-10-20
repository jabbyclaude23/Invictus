export function readCoachReply(text, ok) {
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('Coach is unavailable. Please try again.'); }
  if (!ok || typeof data.reply !== 'string' || !data.reply.trim()) {
    throw new Error('Coach is unavailable. Please try again.');
  }
  return data.reply;
}
