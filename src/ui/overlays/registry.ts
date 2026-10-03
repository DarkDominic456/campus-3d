import type { ComponentType } from 'react'
import type { OverlayId, OverlayPropsMap } from '../../store/useGameStore'
import { InfoOverlay } from './InfoOverlay'
import { TeleportOverlay } from './TeleportOverlay'
import { AuthOverlay } from './AuthOverlay'
import { LearningOverlay } from './LearningOverlay'
import { OfficeOverlay } from './OfficeOverlay'
import { ArcadeOverlay } from './ArcadeOverlay'
import { ProfileOverlay } from './ProfileOverlay'
import { SettingsOverlay } from './SettingsOverlay'
import { PeopleOverlay } from './PeopleOverlay'
import { PeerCardOverlay } from './PeerCardOverlay'

/** Maps overlay ids to components. Overlays receive the props passed to openOverlay(). */
export const overlayRegistry: { [K in OverlayId]: ComponentType<OverlayPropsMap[K]> } = {
  info: InfoOverlay,
  teleport: TeleportOverlay,
  auth: AuthOverlay,
  learning: LearningOverlay,
  office: OfficeOverlay,
  arcade: ArcadeOverlay,
  profile: ProfileOverlay,
  settings: SettingsOverlay,
  people: PeopleOverlay,
  peerCard: PeerCardOverlay,
}
