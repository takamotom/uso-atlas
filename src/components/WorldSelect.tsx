// 世界のかたち選択（球体/平面）のドロップダウン
import { useEffect, useRef, useState } from 'react'
import type { WorldShape } from '../map/regions'

const WORLD_PROFILES: Record<WorldShape, { icon: string; name: string; description: string }> = {
  globe: {
    icon: '🌐',
    name: '球体の世界',
    description: '東の果てと西の果ては繋がっていて、地球を一周できる。',
  },
  flat: {
    icon: '🫓',
    name: '平面の世界',
    description: '世界は平らな盤。東西の果ては繋がらず、海水は縁から流れ落ち続けている。',
  },
}

interface Props {
  value: WorldShape
  onChange: (value: WorldShape) => void
}

export function WorldSelect({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const current = WORLD_PROFILES[value]

  useEffect(() => {
    if (!open) return
    const onOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open])

  return (
    <div className="captain-select" ref={rootRef}>
      <button
        type="button"
        className="captain-current"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="captain-icon" aria-hidden>
          {current.icon}
        </span>
        <span>
          <span className="captain-label">世界</span>
          <span className="captain-name">{current.name}</span>
        </span>
        <span className="captain-caret" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="captain-menu" role="listbox" aria-label="世界のかたちを選ぶ">
          {(Object.entries(WORLD_PROFILES) as [WorldShape, (typeof WORLD_PROFILES)['globe']][]).map(
            ([key, profile]) => (
              <button
                key={key}
                type="button"
                role="option"
                aria-selected={key === value}
                className={`captain-option${key === value ? ' selected' : ''}`}
                onClick={() => {
                  setOpen(false)
                  onChange(key)
                }}
              >
                <span className="captain-icon" aria-hidden>
                  {profile.icon}
                </span>
                <span>
                  <span className="captain-name">{profile.name}</span>
                  <span className="captain-desc">{profile.description}</span>
                </span>
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}
