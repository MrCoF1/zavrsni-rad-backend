module.exports = {
  2: [
    { tip_treninga: 'Full Body', sastav: [
        { misicna_skupina: 'prsa', broj: 2 },
        { misicna_skupina: 'leđa', broj: 1 },
        { misicna_skupina: 'ramena', broj: 1 },
        { misicna_skupina: 'quads', broj: 1 },
        { misicna_skupina: 'hamstring', broj: 1 }
      ], kardio_za_ciljeve: ['mrsavljenje'], prioritet_slot: false },
    { tip_treninga: 'Full Body', sastav: [
        { misicna_skupina: 'prsa', broj: 1 },
        { misicna_skupina: 'leđa', broj: 2 },
        { misicna_skupina: 'quads', broj: 1 },
        { misicna_skupina: 'hamstring', broj: 1 }
      ], kardio_za_ciljeve: ['mrsavljenje'], prioritet_slot: true, prioritet_uvijek_svaki_tjedan: true }
  ],
  3: [
    { tip_treninga: 'Upper', sastav: [
        { misicna_skupina: 'prsa', broj: 2 },
        { misicna_skupina: 'leđa', broj: 2 },
        { misicna_skupina: 'ramena', broj: 1 },
        { misicna_skupina: 'biceps', broj: 1 }
      ], kardio_za_ciljeve: ['mrsavljenje'], prioritet_slot: true },
    { tip_treninga: 'Lower', sastav: [
        { misicna_skupina: 'quads', broj: 2 },
        { misicna_skupina: 'hamstring', broj: 2 },
        { misicna_skupina: 'calves', broj: 1 }
      ], kardio_za_ciljeve: [], prioritet_slot: false },
    { tip_treninga: 'Full Body', sastav: [
        { misicna_skupina: 'prsa', broj: 1 },
        { misicna_skupina: 'leđa', broj: 1 },
        { misicna_skupina: 'ramena', broj: 1 },
        { misicna_skupina: 'triceps', broj: 1 },
        { misicna_skupina: 'quads', broj: 1 },
        { misicna_skupina: 'hamstring', broj: 1 }
      ], kardio_za_ciljeve: ['mrsavljenje', 'clean_bulk'], prioritet_slot: true }
  ],
  4: [
    { tip_treninga: 'Upper', redni_broj: 1, sastav: [
        { misicna_skupina: 'prsa', broj: 2 },
        { misicna_skupina: 'leđa', broj: 2 },
        { misicna_skupina: 'ramena', broj: 1 },
        { misicna_skupina: 'biceps', broj: 1 }
      ], kardio_za_ciljeve: ['mrsavljenje'], prioritet_slot: true },
    { tip_treninga: 'Lower', redni_broj: 1, sastav: [
        { misicna_skupina: 'quads', broj: 2 },
        { misicna_skupina: 'hamstring', broj: 2 },
        { misicna_skupina: 'calves', broj: 1 },
        { misicna_skupina: 'triceps', broj: 1 }
      ], kardio_za_ciljeve: [], prioritet_slot: false },
    { tip_treninga: 'Upper', redni_broj: 2, sastav: [
        { misicna_skupina: 'prsa', broj: 2 },
        { misicna_skupina: 'leđa', broj: 2 },
        { misicna_skupina: 'ramena', broj: 1 },
        { misicna_skupina: 'biceps', broj: 1 }
      ], kardio_za_ciljeve: ['mrsavljenje'], prioritet_slot: true },
    { tip_treninga: 'Lower', redni_broj: 2, sastav: [
        { misicna_skupina: 'quads', broj: 2 },
        { misicna_skupina: 'hamstring', broj: 2 },
        { misicna_skupina: 'calves', broj: 1 },
        { misicna_skupina: 'triceps', broj: 1 }
      ], kardio_za_ciljeve: ['mrsavljenje', 'clean_bulk'], prioritet_slot: false }
  ],
  5: [
    { tip_treninga: 'Push', sastav: [
        { misicna_skupina: 'prsa', broj: 3 },
        { misicna_skupina: 'ramena', broj: 2 },
        { misicna_skupina: 'triceps', broj: 2 }
      ], kardio_za_ciljeve: ['mrsavljenje'], prioritet_slot: true },
    { tip_treninga: 'Pull', sastav: [
        { misicna_skupina: 'leđa', broj: 3 },
        { misicna_skupina: 'biceps', broj: 2 },
        { misicna_skupina: 'ramena', broj: 1, iskljucivo_vjezba: 'Rear Delts' }
      ], kardio_za_ciljeve: [], prioritet_slot: false },
    // TODO: clean_bulk kardio je ovdje stavljen na Legs (najbliži "full body" ekvivalent u ovom splitu).
    // Provjeriti s Filipom je li Lower prikladniji slot za ovaj kardio umjesto Legs prije nego se ovo koristi u logici.
    { tip_treninga: 'Legs', sastav: [
        { misicna_skupina: 'quads', broj: 2 },
        { misicna_skupina: 'hamstring', broj: 2 },
        { misicna_skupina: 'calves', broj: 1 }
      ], kardio_za_ciljeve: ['mrsavljenje', 'clean_bulk'], prioritet_slot: true },
    { tip_treninga: 'Upper', sastav: [
        { misicna_skupina: 'prsa', broj: 2 },
        { misicna_skupina: 'leđa', broj: 2 },
        { misicna_skupina: 'ramena', broj: 1 },
        { misicna_skupina: 'biceps', broj: 1 }
      ], kardio_za_ciljeve: [], prioritet_slot: false },
    { tip_treninga: 'Lower', sastav: [
        { misicna_skupina: 'quads', broj: 2 },
        { misicna_skupina: 'hamstring', broj: 2 },
        { misicna_skupina: 'calves', broj: 1 },
        { misicna_skupina: 'triceps', broj: 1 }
      ], kardio_za_ciljeve: ['mrsavljenje'], prioritet_slot: true }
  ]
};
