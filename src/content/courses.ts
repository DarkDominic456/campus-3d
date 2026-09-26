/** Placeholder course catalogue for the classroom laptop. Replace with real content / an API. */

export interface Lesson {
  title: string
  minutes: number
}

export interface Course {
  id: string
  title: string
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  summary: string
  color: string
  lessons: Lesson[]
}

export const COURSES: Course[] = [
  {
    id: 'web-basics',
    title: 'Web Development Basics',
    level: 'Beginner',
    summary: 'HTML, CSS and JavaScript from zero — build and publish your first page.',
    color: '#f59e0b',
    lessons: [
      { title: 'How the web works', minutes: 8 },
      { title: 'HTML structure', minutes: 14 },
      { title: 'Styling with CSS', minutes: 18 },
      { title: 'JavaScript essentials', minutes: 22 },
      { title: 'Publish your site', minutes: 10 },
    ],
  },
  {
    id: 'react-3d',
    title: 'Interactive 3D with React',
    level: 'Intermediate',
    summary: 'Three.js, React Three Fiber and physics — the stack behind this campus.',
    color: '#8b5cf6',
    lessons: [
      { title: 'Scenes, cameras and lights', minutes: 12 },
      { title: 'Loading GLB models', minutes: 15 },
      { title: 'Physics with Rapier', minutes: 20 },
      { title: 'Character controllers', minutes: 25 },
    ],
  },
  {
    id: 'data-science',
    title: 'Data Science with Python',
    level: 'Intermediate',
    summary: 'pandas, plotting and your first machine-learning model.',
    color: '#0ea5e9',
    lessons: [
      { title: 'Python refresher', minutes: 16 },
      { title: 'DataFrames with pandas', minutes: 20 },
      { title: 'Visualising data', minutes: 14 },
      { title: 'Intro to scikit-learn', minutes: 24 },
    ],
  },
  {
    id: 'design',
    title: 'UI Design Fundamentals',
    level: 'Beginner',
    summary: 'Layout, typography and colour — design interfaces people enjoy using.',
    color: '#ec4899',
    lessons: [
      { title: 'Visual hierarchy', minutes: 10 },
      { title: 'Typography', minutes: 12 },
      { title: 'Colour & contrast', minutes: 12 },
      { title: 'Prototyping', minutes: 18 },
    ],
  },
  {
    id: 'algorithms',
    title: 'Algorithms & Problem Solving',
    level: 'Advanced',
    summary: 'Complexity, recursion, graphs and dynamic programming with practice problems.',
    color: '#16a34a',
    lessons: [
      { title: 'Big-O thinking', minutes: 14 },
      { title: 'Recursion', minutes: 18 },
      { title: 'Graphs & BFS/DFS', minutes: 22 },
      { title: 'Dynamic programming', minutes: 28 },
    ],
  },
]
