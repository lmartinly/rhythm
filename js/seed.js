// Rhythm · starter templates.
// This is only initial content — rename, reorder, edit, archive, duplicate,
// expand or delete any of it. Rhythm adapts to your system, never the reverse.

import { uid } from './util.js';

export function buildSeed() {
  const now = Date.now();
  const items = {};
  const routines = {};
  const rooms = {};

  const mkItem = (name, iconName, category, product = '', notes = '') => {
    const id = uid();
    items[id] = { id, name, icon: iconName, category, product, notes, createdAt: now, archived: false };
    return id;
  };
  let seq = 0;
  const mkRoutine = (name, iconName, category, itemIds, days = []) => {
    const id = uid();
    routines[id] = { id, name, icon: iconName, category, itemIds, days, createdAt: now + seq++, archived: false };
    return id;
  };
  const mkRoom = (name, iconName, tasks) => {
    const id = uid();
    rooms[id] = { id, name, icon: iconName, tasks };
    return id;
  };

  /* ── Items are generic product types. The actual product lives on the item,
        so you can swap products without ever rebuilding a routine. ── */

  // Beauty · skincare
  const cleanser = mkItem('Cleanser', 'droplets', 'beauty');
  const toner = mkItem('Toner', 'droplet', 'beauty');
  const serum = mkItem('Serum', 'sparkles', 'beauty', 'Beauty of Joseon Glow Serum');
  const treatment = mkItem('Treatment', 'moon-star', 'beauty', '', 'Retinol, azelaic acid — whatever the current active is.');
  const exfoliant = mkItem('Exfoliant', 'flower-2', 'beauty');
  const faceMask = mkItem('Face Mask', 'smile', 'beauty');
  const moisturizer = mkItem('Moisturizer', 'milk', 'beauty');
  const eyeCream = mkItem('Eye Cream', 'hand-heart', 'beauty');
  const spf = mkItem('SPF', 'sun', 'beauty');
  const lipCare = mkItem('Lip Care', 'heart', 'beauty');

  // Beauty · hair & body
  const shampoo = mkItem('Shampoo', 'shower-head', 'beauty');
  const conditioner = mkItem('Conditioner', 'droplets', 'beauty');
  const hairMask = mkItem('Hair Mask', 'wand-sparkles', 'beauty');
  const bodyScrub = mkItem('Body Scrub', 'flower', 'beauty');
  const bodyLotion = mkItem('Body Lotion', 'milk', 'beauty');

  // Fitness
  const stretching = mkItem('Stretching', 'person-standing', 'fitness');
  const strength = mkItem('Strength', 'dumbbell', 'fitness');
  const cardio = mkItem('Cardio', 'activity', 'fitness');
  const walk = mkItem('Walk', 'footprints', 'fitness');
  mkItem('Yoga', 'wind', 'fitness');

  // Home
  const makeBed = mkItem('Make Bed', 'bed-double', 'home');
  const dishes = mkItem('Dishes', 'utensils', 'home');
  const counters = mkItem('Wipe Counters', 'spray-can', 'home');
  const trash = mkItem('Take Out Trash', 'trash-2', 'home');
  const laundry = mkItem('Laundry', 'washing-machine', 'home');
  mkItem('Change Sheets', 'bed-double', 'home');
  mkItem('Water Plants', 'sprout', 'home');

  // Health
  const vitamins = mkItem('Vitamins', 'pill', 'health');
  const meditation = mkItem('Meditation', 'leaf', 'health');
  const journal = mkItem('Journal', 'notebook-pen', 'health');
  const earlyNight = mkItem('Early Night', 'alarm-clock', 'health');
  mkItem('Hydration', 'glass-water', 'health');

  /* ── Routines ── */

  mkRoutine('Morning Routine', 'sun', 'beauty',
    [cleanser, toner, serum, eyeCream, moisturizer, spf]);

  // Weekly evening rotation — one routine per night, shown automatically on its day.
  mkRoutine('Monday PM', 'moon-star', 'beauty',
    [cleanser, treatment, moisturizer, lipCare], ['MO']);
  mkRoutine('Tuesday PM', 'droplet', 'beauty',
    [cleanser, toner, serum, eyeCream, moisturizer], ['TU']);
  mkRoutine('Wednesday PM', 'flower-2', 'beauty',
    [cleanser, exfoliant, toner, moisturizer], ['WE']);
  mkRoutine('Thursday PM', 'droplet', 'beauty',
    [cleanser, toner, serum, eyeCream, moisturizer], ['TH']);
  mkRoutine('Friday PM', 'moon-star', 'beauty',
    [cleanser, treatment, moisturizer, lipCare], ['FR']);
  mkRoutine('Saturday PM', 'smile', 'beauty',
    [cleanser, faceMask, toner, eyeCream, moisturizer], ['SA']);
  mkRoutine('Sunday PM', 'moon', 'beauty',
    [cleanser, moisturizer, lipCare], ['SU']);

  mkRoutine('Everything Shower', 'shower-head', 'beauty',
    [shampoo, conditioner, hairMask, bodyScrub, bodyLotion]);
  mkRoutine('Workout', 'dumbbell', 'fitness',
    [stretching, strength, cardio]);
  mkRoutine('Kitchen Reset', 'cooking-pot', 'home',
    [dishes, counters, trash]);
  mkRoutine('Wind Down', 'lamp', 'health',
    [meditation, journal, earlyNight]);

  /* ── Room templates for Home Cleaning ── */

  mkRoom('Living Room', 'sofa', [
    'Tidy surfaces', 'Dust shelves', 'Vacuum floor', 'Fluff cushions', 'Water plants',
  ]);
  mkRoom('Kitchen', 'cooking-pot', [
    'Dishes', 'Wipe counters', 'Clean stovetop', 'Wipe sink', 'Sweep floor', 'Take out trash',
  ]);
  mkRoom('Bathroom', 'bath', [
    'Wipe mirror', 'Clean sink', 'Scrub toilet', 'Wipe shower', 'Change towels', 'Mop floor',
  ]);
  mkRoom('Bedroom', 'bed-double', [
    'Make bed', 'Put clothes away', 'Clear nightstand', 'Vacuum floor', 'Open window',
  ]);

  const pinned = [makeBed, vitamins, walk, dishes, laundry, meditation].filter(Boolean);

  return { items, routines, rooms, pinned };
}
