import { useState } from 'react'

type Vote = { student_name: string; image_id: number; material: string }
type Message = { id: number; student_name: string; kind: string; material: string; text: string }
type Props = { step: number; votes: Vote[]; messages: Message[]; onStep: (step: number) => void; onReset: () => Promise<void> }

export default function TeacherPanel({ step, votes, messages, onStep, onReset }: Props) {
  const [resetting, setResetting] = useState(false)
  
  const activeNames = step === 1
    ? votes.map((vote) => vote.student_name)
    : messages.filter((message) => message.kind === 'question').map((message) => message.student_name)
    
  const students = new Set(activeNames).size
  const stepName = ['관찰하기', '질문하기'][step - 1]
  
  const reset = async () => {
    setResetting(true)
    try {
      await onReset()
    } catch {
      window.alert('초기화하지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setResetting(false)
    }
  }

  return <aside className="teacher-panel">
    <div className="teacher-heading"><span>👩‍🏫</span><div><b>선생님 진행판</b><small>모두의 화면이 함께 바뀌어요</small></div></div>
    <div className="step-controls">
      <button onClick={() => onStep(Math.max(1, step - 1))} disabled={step === 1}>← 이전</button>
      <div><strong>현재 {step}단계</strong><span>{stepName}</span></div>
      <button className="next" onClick={() => onStep(Math.min(2, step + 1))} disabled={step === 2}>다음 단계로 →</button>
    </div>
    <section className="stats">
      <h3>실시간 참여 현황</h3>
      <p className="step-status">{step}단계 · {stepName}</p>
      <div className="participation-count"><b>{students}</b><span>참여 학생</span><em>/</em><b>9</b><span>전체 학생</span></div>
    </section>
    <section className="reset-section">
      <button className="reset-button" type="button" onClick={reset} disabled={resetting}>{resetting ? '초기화 중…' : '↻ 수업 진행 초기화'}</button>
      <small>단계와 학생 참여 기록만 지우며, 대표 그림은 그대로 유지돼요.</small>
    </section>
  </aside>
}