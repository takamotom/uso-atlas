import { useEffect, useMemo, useState } from 'react'
import { useGame } from '../hooks/use-game'
import { useShipAnimation } from '../hooks/use-ship-animation'
import { generateReport } from '../report/generate'
import { exportMapPng } from '../render/export'
import { edgeClaim } from '../report/world-edge'
import { isMuted, playSfx, setMuted } from '../sound/sfx'
import { CompleteScreen } from './CompleteScreen'
import { EdgeReportDialog } from './EdgeReportDialog'
import { GalleryView } from './GalleryView'
import { Hud } from './Hud'
import { ManualSection } from './ManualSection'
import { MapCanvas } from './MapCanvas'
import { ReportDialog } from './ReportDialog'
import { ReportLogDialog } from './ReportLogDialog'
import { WelcomeDialog } from './WelcomeDialog'

const WELCOME_KEY = 'uso-atlas:welcomed'

function isFirstVisit(): boolean {
  try {
    return !localStorage.getItem(WELCOME_KEY)
  } catch {
    return false
  }
}

function markWelcomed(): void {
  try {
    localStorage.setItem(WELCOME_KEY, '1')
  } catch {
    // 保存できなくても進行に支障なし
  }
}

export default function App() {
  const [state, dispatch, saveDiscarded] = useGame()
  // 完成画面を「地図を眺める」で閉じた後は再表示しない（リセットで復活）
  const [completeDismissed, setCompleteDismissed] = useState(false)
  const [truthOverlay, setTruthOverlay] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const [showWelcome, setShowWelcome] = useState(isFirstVisit)
  const [noticeDismissed, setNoticeDismissed] = useState(false)
  const [muted, setMutedState] = useState(isMuted)
  const shipPos = useShipAnimation(state.phase, () => dispatch({ type: 'ARRIVED' }))

  const isComplete = state.phase.type === 'complete'
  useEffect(() => {
    if (isComplete) playSfx('complete')
  }, [isComplete])

  const preview = useMemo(() => {
    if (state.phase.type !== 'reviewing') return null
    const { target, attempt } = state.phase
    return { region: target, geometry: generateReport(target, attempt, state.intensity).geometry }
  }, [state.phase, state.intensity])

  // 開発用ギャラリー: URL末尾に #gallery を付けると報告のバリエーションを一覧できる
  if (window.location.hash === '#gallery') return <GalleryView />

  const closeWelcome = () => {
    markWelcomed()
    setShowWelcome(false)
  }

  return (
    <div className="app">
      <Hud
        state={state}
        truthOverlay={truthOverlay}
        muted={muted}
        onToggleMute={() => {
          setMuted(!muted)
          setMutedState(!muted)
        }}
        onOpenLog={() => setShowLog(true)}
        onToggleTruthOverlay={() => setTruthOverlay((v) => !v)}
        onExport={() => exportMapPng(state)}
        onReset={() => {
          setTruthOverlay(false)
          dispatch({ type: 'RESET' })
        }}
        onIntensityChange={(intensity) => {
          if (intensity === state.intensity) return
          const started = Object.keys(state.regions).length > 1
          if (
            !started ||
            window.confirm('船長を替えると、いまの地図を消して新しい航海が始まります。よろしいですか？')
          ) {
            setTruthOverlay(false)
            dispatch({ type: 'RESET', intensity })
          }
        }}
      />
      {saveDiscarded && !noticeDismissed && (
        <div className="notice-banner" role="status">
          <span>保存されていた地図は古い版式だったため、新しい航海を始めました。</span>
          <button type="button" onClick={() => setNoticeDismissed(true)}>
            閉じる
          </button>
        </div>
      )}
      <MapCanvas
        state={state}
        preview={preview}
        shipPos={shipPos}
        truthOverlay={isComplete && truthOverlay}
        edgeFallsPreview={
          state.phase.type === 'edgeReviewing' && edgeClaim(state.phase.attempt) === 'falls'
        }
        onRegionClick={(id) => {
          playSfx('sail')
          dispatch({ type: 'DISPATCH', target: id })
        }}
      />
      {state.phase.type === 'edgeReviewing' && (
        <EdgeReportDialog
          claim={edgeClaim(state.phase.attempt)}
          attempt={state.phase.attempt}
          onBelieve={() => {
            playSfx('stamp')
            dispatch({ type: 'BELIEVE' })
          }}
          onReject={() => {
            playSfx('reject')
            dispatch({ type: 'REJECT' })
          }}
        />
      )}
      {state.phase.type === 'reviewing' && (
        <ReportDialog
          regionId={state.phase.target}
          attempt={state.phase.attempt}
          onBelieve={() => {
            playSfx('stamp')
            dispatch({ type: 'BELIEVE' })
          }}
          onReject={() => {
            playSfx('reject')
            dispatch({ type: 'REJECT' })
          }}
        />
      )}
      {showLog && <ReportLogDialog state={state} onClose={() => setShowLog(false)} />}
      {showWelcome && (
        <WelcomeDialog
          onStart={closeWelcome}
          onReadManual={() => {
            closeWelcome()
            document.getElementById('manual')?.scrollIntoView({ behavior: 'smooth' })
          }}
        />
      )}
      {isComplete && !completeDismissed && (
        <CompleteScreen
          state={state}
          onExport={() => exportMapPng(state)}
          onReset={() => {
            setCompleteDismissed(false)
            setTruthOverlay(false)
            dispatch({ type: 'RESET' })
          }}
          onClose={() => setCompleteDismissed(true)}
          onCompare={() => {
            setTruthOverlay(true)
            setCompleteDismissed(true)
          }}
        />
      )}
      <ManualSection />
    </div>
  )
}
