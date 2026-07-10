// The full draft pool: 16 Big Brother Season 28 houseguests + 1 Mystery Player = 17 cards.
// `image` values map to files served statically from /assets.
// Keep this list data-driven so images/names can be swapped without touching engine code.

const roster = [
  { id: 'angela-murray', name: 'Angela Murray', image: 'angela-murray.avif' },
  { id: 'ashley-trail', name: 'Ashley Trail', image: 'ashley-trail-houseguest-season-28-1093842103_2661ec.webp' },
  { id: 'barrett-pfeiffer', name: 'Barrett Pfeiffer', image: 'barrett-pfeiffer-houseguest-season-28-1093842108.webp' },
  { id: 'chuk-anyanwu', name: 'Chuk Anyanwu', image: 'chuk-anyanwu-houseguest-season-28-1093842109_d3305d.webp' },
  { id: 'drew-campbell', name: 'Drew Campbell', image: 'drew-campbell-houseguest-season-28-1094040777_6131bb.webp' },
  { id: 'haley-thogmartin', name: 'Haley Thogmartin', image: 'haley-thogmartin-houseguest-season-28-1093842226.webp' },
  { id: 'jason-de-puy', name: 'Jason de Puy', image: 'jason-de-puy-houseguest-season-1093842232.webp' },
  { id: 'kamuela-kirk', name: 'Kamuela "Kamu" Kirk', image: 'kamuela-kamu-kirk-houseguest-season-1093842224.webp' },
  { id: 'latrice-verrett', name: 'Latrice Verrett', image: 'latrice-verrett-houseguest-season-28-1093842235.webp' },
  { id: 'lyric-medeiros', name: 'Lyric Medeiros', image: 'lyric-medeiros-houseguest-season-28-1093842234.webp' },
  { id: 'mallory-aurichio', name: 'Mallory Aurichio', image: 'mallory-aurichio-houseguest-season-28-1093842237.webp' },
  { id: 'melody-morris', name: 'Melody Morris', image: 'melody-morris-houseguest-season-28-1093842236.webp' },
  { id: 'rome-seymour', name: 'Rome Seymour', image: 'rome-seymour-houseguest-season-28-1093842223.webp' },
  { id: 'rick-devens', name: 'Rick Devens', image: 'survivor-50-rick-devens-header.avif' },
  { id: 'taylor-brown', name: 'Taylor Brown', image: 'taylor-brown-houseguest-season-28-1093842240.webp' },
  { id: 'yash-patel', name: 'Yash Patel', image: 'yash-patel-houseguest-season-28-1093842241_532a52.webp' },
  { id: 'mystery-player', name: 'Mystery Player', image: 'Myster_player.webp', isMystery: true },
];

module.exports = roster;
