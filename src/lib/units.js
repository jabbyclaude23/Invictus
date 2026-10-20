// Profile.weight remains kilograms for existing nutrition/training consumers.
const KG_PER_LB = 0.45359237;
export const lbsToKg = value => Number(value) * KG_PER_LB;
export const kgToLbs = value => Number(value) / KG_PER_LB;
export function workoutProfileFromLbs(form) {
  const pounds = Number(form.weight);
  if (!Number.isFinite(pounds) || pounds <= 0) throw new Error('Enter a weight greater than zero in pounds.');
  return { ...form, weight: lbsToKg(pounds), weightKg: lbsToKg(pounds), weightStorageUnit: 'kg', weightUnit: 'lbs', weightLbs: pounds, weight_display: `${pounds} lbs` };
}
