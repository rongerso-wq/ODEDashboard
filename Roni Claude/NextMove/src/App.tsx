import { useEffect } from 'react'
import { useRoute } from './lib/router'
import { stop as stopVoice } from './lib/voice'
import { SettingsProvider } from './lib/settings'
import Home from './screens/Home'
import LocalGame from './screens/LocalGame'
import ComputerSetup from './screens/ComputerSetup'
import ComputerGame from './screens/ComputerGame'
import Review from './screens/Review'
import Academy from './screens/Academy'
import LessonPlayer from './screens/LessonPlayer'
import PuzzlesHome from './screens/PuzzlesHome'
import PuzzlePlay from './screens/PuzzlePlay'
import { parsePuzzleRoute } from './puzzles/model'
import PuzzleRush from './screens/PuzzleRush'
import MistakesPractice from './screens/MistakesPractice'
import UpdatePrompt from './components/UpdatePrompt'
import CrashGuard from './components/CrashGuard'

function Screen() {
  const route = useRoute()
  // Elias stops talking when you leave a screen.
  useEffect(() => stopVoice(), [route])
  if (route.startsWith('/learn/')) return <LessonPlayer id={route.slice('/learn/'.length)} />
  const puzzleMode = parsePuzzleRoute(route)
  if (puzzleMode) return <PuzzlePlay key={route} mode={puzzleMode} />
  switch (route) {
    case '/mistakes':
      return <MistakesPractice />
    case '/puzzles':
      return <PuzzlesHome />
    case '/puzzles/rush':
      return <PuzzleRush />
    case '/learn':
      return <Academy />
    case '/play/local':
      return <LocalGame />
    case '/play/computer':
      return <ComputerSetup />
    case '/play/computer/game':
      return <ComputerGame />
    case '/review':
      return <Review />
    default:
      return <Home />
  }
}

/** A screen that throws shows CrashGuard's way out; a new route starts fresh. */
function GuardedScreen() {
  const route = useRoute()
  return (
    <CrashGuard key={route}>
      <Screen />
    </CrashGuard>
  )
}

export default function App() {
  return (
    <SettingsProvider>
      {/* the one main landmark, for screen-reader "skip to content" (QA G19) */}
      <main>
        <GuardedScreen />
      </main>
      <UpdatePrompt />
    </SettingsProvider>
  )
}
