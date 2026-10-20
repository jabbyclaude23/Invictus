import test from 'node:test';
import assert from 'node:assert/strict';
import { lbsToKg, kgToLbs, workoutProfileFromLbs } from './units.js';
test('converts pounds once to canonical kilograms', () => {
  assert.ok(Math.abs(lbsToKg(180) - 81.6466266) < 0.00001);
  assert.ok(Math.abs(kgToLbs(lbsToKg(180)) - 180) < 0.00001);
  const profile = workoutProfileFromLbs({weight:'180',age:'25'});
  assert.ok(Math.abs(profile.weight - 81.6466266) < 0.00001);
  assert.equal(profile.weightUnit,'lbs'); assert.equal(profile.weightLbs,180); assert.equal(profile.weight_display,'180 lbs');
  assert.equal(profile.age,'25');
});
test('rejects missing, negative and nonfinite onboarding weights', () => {
  for (const weight of ['',0,-5,Infinity,'no']) assert.throws(()=>workoutProfileFromLbs({weight}));
});
