import type { ReactNode } from 'react'

export function Modal({ onClose, children, wide }: { onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-sheet${wide ? ' modal-sheet-wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        {children}
      </div>
    </div>
  )
}
