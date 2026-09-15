import { useState } from 'react'

type Vote = { student_name: string; image_id: number; material: string }
type Message = { id: number; student_name: string; kind: string; material: string; text: string }
type Props = { step: number; votes: Vote[]; messages: Message[]; onStep: (step: number) => void; onReset: () => Promise<void> }

export default function TeacherPanel({ step, votes, messages, onStep, onReset }: Props) {
  const [resetting, setResetting] = useState(false)
  const [showQuestion, setShowQuestion] = useState(false) // 1단계 팝업 상태
  const [showWorksheet, setShowWorksheet] = useState(false) // 2단계 팝업 상태
  
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

      {/* 단계별 맞춤 팝업 버튼 */}
      <section className="stats" style={{ marginBottom: '15px' }}>
        {step === 1 ? (
          <button 
            onClick={() => setShowQuestion(true)}
            style={{ width: '100%', padding: '12px', backgroundColor: '#ffeaa7', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', color: '#2d3436' }}
          >
            🔍 1단계: 핵심 탐구 질문 띄우기
          </button>
        ) : (
          <button 
            onClick={() => setShowWorksheet(true)}
            style={{ width: '100%', padding: '12px', backgroundColor: '#ff7675', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', color: 'white' }}
          >
            🍎 2단계: 4칸 사과 학습지 띄우기
          </button>
        )}
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

      {/* 1단계: 탐구 질문 대형 팝업 UI */}
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

      {/* 2단계: 사과 학습지 대형 팝업 UI */}
      {showWorksheet && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '20px', textAlign: 'center', width: '90%', maxWidth: '650px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2 style={{ fontSize: '2rem', color: '#d63031', marginBottom: '20px', marginTop: 0 }}>🍎 4칸 미니 비교 체험</h2>
            
            {/* SVG 사과 도안 영역 */}
            <div style={{ width: '100%', maxWidth: '500px', backgroundColor: '#f5f6fa', padding: '15px', borderRadius: '15px', border: '2px dashed #dcdde1' }}>
              <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '10px' }}>
                <svg width="100%" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
                  <rect x="5" y="5" width="590" height="590" fill="none" stroke="black" strokeWidth="3"/>
                  <line x1="300" y1="0" x2="300" y2="600" stroke="black" strokeWidth="2" strokeDasharray="8,8"/>
                  <line x1="0" y1="300" x2="600" y2="300" stroke="black" strokeWidth="2" strokeDasharray="8,8"/>
                  <text x="20" y="40" fontSize="22" fontFamily="sans-serif" fontWeight="bold" fill="#333">1. 연필</text>
                  <text x="320" y="40" fontSize="22" fontFamily="sans-serif" fontWeight="bold" fill="#333">2. 볼펜</text>
                  <text x="20" y="330" fontSize="22" fontFamily="sans-serif" fontWeight="bold" fill="#333">3. 색연필</text>
                  <text x="450" y="330" fontSize="22" fontFamily="sans-serif" fontWeight="bold" fill="#333">4. 사인펜</text>
                  <path d="M 300 150 Q 310 90 340 80" fill="none" stroke="#555" strokeWidth="6" strokeLinecap="round"/>
                  <path d="M 340 80 Q 390 70 390 110 Q 340 120 340 80" fill="none" stroke="black" strokeWidth="3"/>
                  <path d="M 300 160 C 380 120, 520 200, 480 360 C 440 500, 350 520, 300 480 C 250 520, 160 500, 120 360 C 80 200, 220 120, 300 160 Z" fill="none" stroke="black" strokeWidth="5" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            <button 
              onClick={() => setShowWorksheet(false)} 
              style={{ marginTop: '25px', padding: '12px 30px', fontSize: '1.2rem', backgroundColor: '#dfe6e9', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}