import { useMemo, useState } from 'react'
import { useGame } from '../hooks/use-game'
import { useShipAnimation } from '../hooks/use-ship-animation'
import { generateReport } from '../report/generate'
import { exportMapPng } from '../render/export'
import { CompleteScreen } from './CompleteScreen'
import { GalleryView } from './GalleryView'
import { Hud } from './Hud'
import { MapCanvas } from './MapCanvas'
import { ReportDialog } from './ReportDialog'

export default function App() {
  const [state, dispatch] = useGame()
  // 完成画面を「地図を眺める」で閉じた後は再表示しない（リセットで復活）
  const [completeDismissed, setCompleteDismissed] = useState(false)
  const shipPos = useShipAnimation(state.phase, () => dispatch({ type: 'ARRIVED' }))

  const isComplete = state.phase.type === 'complete'

  const preview = useMemo(() => {
    if (state.phase.type !== 'reviewing') return null
    const { target, attempt } = state.phase
    return { region: target, geometry: generateReport(target, attempt).geometry }
  }, [state.phase])

  // 開発用ギャラリー: URL末尾に #gallery を付けると報告のバリエーションを一覧できる
  if (window.location.hash === '#gallery') return <GalleryView />

  return (
    <div className="app">
      <Hud
        state={state}
        onExport={() => exportMapPng(state)}
        onReset={() => dispatch({ type: 'RESET' })}
      />
      <MapCanvas
        state={state}
        preview={preview}
        shipPos={shipPos}
        onRegionClick={(id) => dispatch({ type: 'DISPATCH', target: id })}
      />
      {state.phase.type === 'reviewing' && (
        <ReportDialog
          regionLabel={state.phase.target}
          attempt={state.phase.attempt}
          onBelieve={() => dispatch({ type: 'BELIEVE' })}
          onReject={() => dispatch({ type: 'REJECT' })}
        />
      )}
      {isComplete && !completeDismissed && (
        <CompleteScreen
          state={state}
          onExport={() => exportMapPng(state)}
          onReset={() => {
            setCompleteDismissed(false)
            dispatch({ type: 'RESET' })
          }}
          onClose={() => setCompleteDismissed(true)}
        />
      )}
    </div>
  )
}
