// 船長選択のリッチドロップダウン（アイコン＋名前＋説明カード）
import { useEffect, useRef, useState } from 'react'
import { CAPTAIN_PROFILES } from '../report/config'
import type { LieIntensity } from '../report/config'

interface Props {
  value: LieIntensity
  onChange: (value: LieIntensity) => void
}

export function CaptainSelect({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const current = CAPTAIN_PROFILES[value]

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
          <span className="captain-label">船長</span>
          <span className="captain-name">{current.name}</span>
        </span>
        <span className="captain-caret" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="captain-menu" role="listbox" aria-label="船長を選ぶ">
          {(Object.entries(CAPTAIN_PROFILES) as [LieIntensity, (typeof CAPTAIN_PROFILES)['mild']][]).map(
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
