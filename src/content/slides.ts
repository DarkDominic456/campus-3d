/** Placeholder "About Us" / "Team" deck for the conference room screen. */

export type Slide =
  | { kind: 'title'; title: string; subtitle: string }
  | { kind: 'points'; title: string; points: string[] }
  | { kind: 'team'; title: string; members: { name: string; role: string; color: string }[] }
  | { kind: 'stats'; title: string; stats: { value: string; label: string }[] }

export const SLIDES: Slide[] = [
  { kind: 'title', title: 'About Us', subtitle: 'Learning you can walk into.' },
  {
    kind: 'points',
    title: 'Our mission',
    points: [
      'Make online learning feel like being on campus',
      'Mix courses, play and community in one place',
      'Run in any browser — no installs, no headsets',
    ],
  },
  {
    kind: 'stats',
    title: 'Where we are',
    stats: [
      { value: '5', label: 'courses' },
      { value: '6', label: 'campus zones' },
      { value: '6', label: 'mini games' },
    ],
  },
  {
    kind: 'team',
    title: 'The team',
    members: [
      { name: 'Asha Rao', role: 'Founder & CEO', color: '#f59e0b' },
      { name: 'Dev Mehta', role: 'CTO', color: '#8b5cf6' },
      { name: 'Lina Park', role: 'Head of Learning', color: '#0ea5e9' },
      { name: 'Omar Haddad', role: '3D Designer', color: '#ec4899' },
    ],
  },
  { kind: 'title', title: 'Thank you!', subtitle: 'Visit the office reception to request a demo.' },
]
