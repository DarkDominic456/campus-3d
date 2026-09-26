/** Paint-by-numbers pictures. Each row is a string of palette numbers (1-based). */

export interface Picture {
  id: string
  name: string
  palette: string[] // index 0 = colour number 1
  rows: string[]
}

export const PICTURES: Picture[] = [
  {
    id: 'heart',
    name: 'Heart',
    palette: ['#bae6fd', '#ef4444', '#fca5a5'],
    rows: [
      '111111111111',
      '112211112211',
      '122221122221',
      '123222222221',
      '132222222221',
      '122222222221',
      '112222222211',
      '111222222111',
      '111122221111',
      '111112211111',
      '111111111111',
      '111111111111',
    ],
  },
  {
    id: 'tree',
    name: 'Tree',
    palette: ['#bae6fd', '#22c55e', '#15803d', '#92400e', '#65a30d'],
    rows: [
      '111111111111',
      '111112211111',
      '111122221111',
      '111222322111',
      '112232222211',
      '122222223221',
      '123222222221',
      '111114411111',
      '111114411111',
      '111114411111',
      '555555555555',
      '555555555555',
    ],
  },
  {
    id: 'house',
    name: 'House',
    palette: ['#bae6fd', '#dc2626', '#fde68a', '#78350f', '#38bdf8', '#65a30d'],
    rows: [
      '111111111111',
      '111112211111',
      '111122221111',
      '111222222111',
      '112222222211',
      '122222222221',
      '113333333311',
      '113553333311',
      '113553344311',
      '113333344311',
      '666666666666',
      '666666666666',
    ],
  },
]

// Catch typos in the grids early (dev only).
if (import.meta.env.DEV) {
  for (const p of PICTURES) {
    const width = p.rows[0].length
    for (const row of p.rows) {
      if (row.length !== width) console.error(`Picture "${p.id}" has a row of length ${row.length}, expected ${width}`)
      for (const ch of row) if (Number(ch) < 1 || Number(ch) > p.palette.length) console.error(`Picture "${p.id}" uses colour ${ch}`)
    }
  }
}
