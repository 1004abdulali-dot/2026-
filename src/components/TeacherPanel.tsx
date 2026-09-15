import { useState } from 'react'

type Vote = { student_name: string; image_id: number; material: string }
type Message = { id: number; student_name: string; kind: string; material: string; text: string }
type Props = { step: number; votes: Vote[]; messages: Message[]; onStep: (step: number) => void; onReset: () => Promise<void> }

export default function TeacherPanel({ step, votes, messages, onStep, onReset }: Props) {
  const [resetting, setResetting] = useState(false)
  const [showQuestion, setShowQuestion] = useState(false)
  
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

  return (
    <aside className="teacher-panel">
      <div className="teacher-heading"><span>👩‍🏫</span><div><b>선생님 진행판</b><small>모두의 화면이 함께 바뀌어요</small></div></div>
      <div className="step-controls">
        <button onClick={() => onStep(Math.max(1, step - 1))} disabled={step === 1}>← 이전</button>
        <div><strong>현재 {step}단계</strong><span>{stepName}</span></div>
        <button className="next" onClick={() => onStep(Math.min(2, step + 1))} disabled={step === 2}>다음 단계로 →</button>
      </div>

      <section className="stats" style={{ marginBottom: '15px' }}>
         <button 
            onClick={() => setShowQuestion(true)}
            style={{ width: '100%', padding: '12px', backgroundColor: '#ffeaa7', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', color: '#2d3436' }}
          >
            🔍 핵심 탐구 질문 띄우기
          </button>
      </section>

      <section className="stats">
        <h3>실시간 참여 현황</h3>
        <p className="step-status">{step}단계 · {stepName}</p>
        <div className="participation-count"><b>{students}</b><span>참여 학생</span><em>/</em><b>9</b><span>전체 학생</span></div>
      </section>
      
      <section className="reset-section">
        <button className="reset-button" type="button" onClick={reset} disabled={resetting}>{resetting ? '초기화 중…' : '↻ 수업 진행 초기화'}</button>
        <small>단계와 학생 참여 기록만 지우며, 대표 그림은 그대로 유지돼요.</small>
      </section>

      {/* 탐구 질문 대형 팝업 UI */}
      {showQuestion && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: 'white', padding: '50px', borderRadius: '20px', textAlign: 'center', maxWidth: '80%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h2 style={{ fontSize: '2.5rem', color: '#2d3436', marginBottom: '30px' }}>🔍 오늘의 탐구 질문</h2>
            <p style={{ fontSize: '2.5rem', lineHeight: '1.6', color: '#0984e3', fontWeight: 'bold', wordBreak: 'keep-all' }}>
              내가 발견한 특징을 가장 잘 보여줄<br/>미술 재료는 무엇일까?
            </p>
            <button 
              onClick={() => setShowQuestion(false)} 
              style={{ marginTop: '40px', padding: '15px 30px', fontSize: '1.2rem', backgroundColor: '#dfe6e9', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}