import { type PointerEvent, useRef, useState } from 'react'
import { MATERIALS } from './MaterialGrid'

type Vote = { student_name: string; image_id: number; material: string }
type Drawing = { image_id: number; art: string; detail: string; image_data?: string | null; answer_material?: string | null; answer_revealed?: number }
type Props = {
  role: 'teacher' | 'student'
  studentName: string
  votes: Vote[]
  drawings: Drawing[]
  onVote: (imageId: number, material: string) => void
  onImageUpload: (imageId: number, imageData: string) => Promise<void>
  onAnswerChange: (imageId: number, material: string) => Promise<void>
  onRevealAllAnswers: () => Promise<void>
}

export default function StepOne({ role, studentName, votes, drawings, onVote, onImageUpload, onAnswerChange, onRevealAllAnswers }: Props) {
  const [expanded, setExpanded] = useState<Drawing | null>(null)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [busyImage, setBusyImage] = useState<number | null>(null)
  const [busyReveal, setBusyReveal] = useState(false)
  const [showAnswers, setShowAnswers] = useState(false)
  const drag = useRef<{ x: number; y: number } | null>(null)

  const open = (drawing: Drawing) => { setExpanded(drawing); setScale(1); setPosition({ x: 0, y: 0 }) }
  const upload = (imageId: number, file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return window.alert('사진 파일만 선택해 주세요.')
    if (file.size > 4_500_000) return window.alert('사진은 4.5MB 이하로 선택해 주세요.')
    const reader = new FileReader()
    reader.onload = async () => {
      setBusyImage(imageId)
      try { await onImageUpload(imageId, String(reader.result)) } catch { window.alert('사진을 바꾸지 못했어요. 다시 시도해 주세요.') } finally { setBusyImage(null) }
    }
    reader.readAsDataURL(file)
  }
  const revealAll = async () => {
    if (drawings.some((drawing) => !drawing.answer_material)) return window.alert('네 그림의 정답을 모두 설정한 뒤 공개해 주세요.')
    setBusyReveal(true)
    try { await onRevealAllAnswers() } catch { window.alert('정답을 공개하지 못했어요. 다시 시도해 주세요.') } finally { setBusyReveal(false) }
  }
  const zoom = (amount: number) => setScale((value) => Math.max(1, Math.min(3, Number((value + amount).toFixed(1)))))
  const startDrag = (event: PointerEvent<HTMLDivElement>) => { drag.current = { x: event.clientX - position.x, y: event.clientY - position.y }; event.currentTarget.setPointerCapture(event.pointerId) }
  const moveDrag = (event: PointerEvent<HTMLDivElement>) => { if (drag.current) setPosition({ x: event.clientX - drag.current.x, y: event.clientY - drag.current.y }) }
  const endDrag = () => { drag.current = null }
  const allRevealed = drawings.length > 0 && drawings.every((drawing) => drawing.answer_revealed && drawing.answer_material)

  return (
    <section className="step-one">
      <div className="section-intro"><span className="step-chip">1단계 · 관찰 탐정</span><h2>어떤 재료로 그렸을까요?</h2><p>그림을 눌러 자세히 보고, 생각한 재료를 골라 보세요!</p></div>
      {role === 'teacher' && <section className="teacher-answer-panel"><div><b>🔐 정답 관리</b><p>정답은 선생님 화면에서만 확인할 수 있어요.</p></div><div className="teacher-answer-actions"><button type="button" className="answer-visibility-button" onClick={() => setShowAnswers((value) => !value)}>{showAnswers ? '정답 설정 숨기기' : '정답 설정 보기'}</button><button type="button" className="reveal-all-button" disabled={busyReveal || allRevealed} onClick={revealAll}>{allRevealed ? '전체 정답 공개됨' : busyReveal ? '공개 중…' : '전체 정답 공개'}</button></div></section>}
      <div className="drawing-grid">
        {drawings.map((drawing) => {
          const mine = votes.find((vote) => vote.student_name === studentName && vote.image_id === drawing.image_id)?.material
          const answer = drawing.answer_material || ''
          const revealed = Boolean(drawing.answer_revealed && answer)
          return <article className="drawing-card" key={drawing.image_id}>
            <button type="button" className={`art-preview art-${drawing.image_id}`} onClick={() => open(drawing)} aria-label="그림 크게 보기">{drawing.image_data ? <img src={drawing.image_data} alt="관찰 그림" /> : <span>{drawing.art}</span>}<i>🔍 눌러서 크게 보기</i></button>
            <h3>이 그림의 재료는 무엇일까요?</h3>
            {role === 'teacher' && <div className="teacher-drawing-tools"><label className="change-photo-button">{busyImage === drawing.image_id ? '변경 중…' : '사진 변경'}<input type="file" accept="image/*" onChange={(event) => upload(drawing.image_id, event.target.files?.[0])} /></label>{showAnswers && <div className="answer-settings"><span>정답 설정</span><div>{MATERIALS.map((material) => <button type="button" className={answer === material.name ? 'active' : ''} onClick={() => onAnswerChange(drawing.image_id, material.name)} key={material.name}>{material.icon} {material.name}</button>)}</div></div>}</div>}
            {role === 'student' && <div className="choice-grid">{MATERIALS.map((material) => {
              const selected = mine === material.name
              const incorrect = revealed && selected && material.name !== answer
              const correct = revealed && material.name === answer
              return <button type="button" onClick={() => onVote(drawing.image_id, material.name)} className={`${selected ? 'selected' : ''} ${incorrect ? 'incorrect' : ''} ${correct ? 'correct' : ''}`} title={incorrect ? `정답은 ${answer}이에요` : undefined} key={material.name}>{material.icon} {material.name}{correct && <b> ✓</b>}</button>
            })}</div>}
            {role === 'student' && mine && !revealed && <p className="answer-note">내 선택: <b>{mine}</b> ✓</p>}
            {role === 'student' && revealed && !mine && <p className="answer-note">정답: <b>{answer}</b> ✓</p>}
          </article>
        })}
      </div>
      {expanded && <div className="art-modal" role="dialog" aria-modal="true" aria-label="그림 확대 보기" onMouseDown={() => setExpanded(null)}><div className="art-modal-card zoom-modal" onMouseDown={(event) => event.stopPropagation()}><button type="button" className="modal-close" onClick={() => setExpanded(null)} aria-label="확대 보기 닫기">×</button><h2>그림 자세히 보기</h2><p>사진을 드래그해서 움직이고, 아래 버튼으로 크기를 조절해 보세요.</p><div className="zoom-stage" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>{expanded.image_data ? <img src={expanded.image_data} alt="확대 관찰 사진" draggable={false} style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }} /> : <span style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }}>{expanded.art}</span>}</div><div className="zoom-controls"><button type="button" onClick={() => zoom(-0.3)} disabled={scale <= 1}>－ 축소</button><strong>{Math.round(scale * 100)}%</strong><button type="button" onClick={() => zoom(0.3)} disabled={scale >= 3}>＋ 확대</button><button type="button" onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }) }}>처음으로</button></div><button type="button" className="modal-confirm" onClick={() => setExpanded(null)}>다 봤어요</button></div></div>}
    </section>
  )
}
