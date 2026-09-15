import { useCallback, useEffect, useState } from 'react'
import { api } from './lib/api'
import StepOne from './components/StepOne'
import MaterialGrid from './components/MaterialGrid'
import TeacherPanel from './components/TeacherPanel'
import StudentInput from './components/StudentInput'

type Role = 'teacher' | 'student'
type Vote = { student_name: string; image_id: number; material: string }
type Message = { id: number; student_name: string; kind: string; material: string; text: string }
type Drawing = { image_id: number; art: string; detail: string; image_data?: string | null; answer_material?: string | null; answer_revealed?: number }
type State = { step: number; votes: Vote[]; messages: Message[]; drawings: Drawing[] }

const empty: State = { step: 1, votes: [], messages: [], drawings: [] }

export default function App() {
  const [role, setRole] = useState<Role>('teacher')
  const [name, setName] = useState('')
  const [joined, setJoined] = useState(false)
  const [state, setState] = useState<State>(empty)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showHint, setShowHint] = useState(false) // 학생 힌트 팝업 상태

  const refresh = useCallback(async () => { 
    try { 
      const response = await api('state'); 
      if (!response.ok) throw new Error(); 
      setState(await response.json()); 
      setError('') 
    } catch { 
      setError('수업 연결을 확인하고 있어요. 잠시 후 다시 시도해 주세요.') 
    } finally { 
      setLoading(false) 
    } 
  }, [])

  useEffect(() => { 
    refresh(); 
    
    // 백엔드 실시간 통신(웹소켓) 연결 유지
    const wssUrl = 'wss://two026-sungduckartclass.onrender.com/api/ws'; 
    let socket: WebSocket | undefined; 
    
    try { 
      socket = new WebSocket(wssUrl); 
      socket.onmessage = () => refresh();
    } catch { 
      /* fallback polling */ 
    } 
    
    const timer = window.setInterval(refresh, 4500); 
    return () => { 
      socket?.close(); 
      window.clearInterval(timer);
    } 
  }, [refresh])

  const post = async (path: string, body?: unknown) => { 
    const response = await api(path, { 
      method: 'POST', 
      headers: body ? { 'Content-Type': 'application/json' } : undefined, 
      body: body ? JSON.stringify(body) : undefined 
    }); 
    if (!response.ok) throw new Error(); 
    await refresh() 
  }

  const resetSession = async () => {
    const response = await api('reset-session', { method: 'POST' })
    if (!response.ok) throw new Error('reset failed')
    setState((current) => ({ ...current, step: 1, votes: [], messages: [], drawings: current.drawings.map((drawing) => ({ ...drawing, answer_revealed: 0 })) }))
    try { await refresh() } catch { /* 화면의 즉시 초기화 상태를 유지합니다. */ }
  }

  const title = ['재료 탐정이 되어 봐요!', '궁금한 점을 모아 봐요!'][state.step - 1]

  if (!joined) return <main className="welcome"><div className="welcome-card"><div className="logo">🎨</div><span className="eyebrow">3학년 미술 · 함께하는 수업</span><h1>톡톡! 재료 탐험</h1><p>친구들과 실시간으로 생각을 나누는<br />즐거운 미술 시간이에요.</p><div className="role-switch"><button className={role === 'student' ? 'chosen' : ''} onClick={() => setRole('student')}>🧒 학생으로 참여</button><button className={role === 'teacher' ? 'chosen' : ''} onClick={() => setRole('teacher')}>👩‍🏫 선생님으로 시작</button></div>{role === 'student' && <input value={name} onChange={(event) => setName(event.target.value)} maxLength={30} placeholder="내 이름을 적어 주세요" />}{role === 'student' && !name.trim() && <small>이름을 적으면 참여할 수 있어요.</small>}<button className="join" onClick={() => (role === 'teacher' || name.trim()) && setJoined(true)}>수업 들어가기 →</button></div></main>

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span>🎨</span><b>톡톡! 재료 탐험</b></div>
        <div className="live"><i /> 실시간 함께 수업 중</div>
        <div className="user-badge">{role === 'teacher' ? '👩‍🏫 선생님' : `🧒 ${name}`}</div>
      </header>
      
      <main className={role === 'teacher' ? 'classroom teacher-layout' : 'classroom'}>
        <section className="lesson-area">
          <div className="lesson-header" style={{ position: 'relative' }}>
            <span className="step-chip">{state.step}단계 / 2단계</span>
            <h1>{title}</h1>
            <p>{state.step === 1 ? '그림을 자세히 관찰하고 재료를 맞혀 보세요.' : '재료를 골라 질문을 보내면 친구들 화면에도 나타나요.'}</p>
            
            {/* 2단계 학생 화면에서만 보이는 힌트 버튼 */}
            {role === 'student' && state.step === 2 && (
              <button 
                onClick={() => setShowHint(true)}
                style={{ marginTop: '15px', padding: '8px 20px', backgroundColor: '#ffeaa7', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', color: '#2d3436', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', fontSize: '0.95rem' }}
              >
                💡 질문이 어려울 땐 여기를 눌러요!
              </button>
            )}
          </div>

          {loading ? (
            <div className="status">수업 내용을 불러오고 있어요…</div>
          ) : (
            <>
              {state.step === 1 ? (
                <StepOne role={role} studentName={name} votes={state.votes} drawings={state.drawings} onVote={(imageId, material) => post('votes', { student_name: name, image_id: imageId, material })} onImageUpload={(imageId, imageData) => post('drawing-image', { image_id: imageId, image_data: imageData })} onAnswerChange={(imageId, material) => post('drawing-answer', { image_id: imageId, answer_material: material })} onRevealAllAnswers={() => post('drawing-answers/reveal-all')} />
              ) : (
                <MaterialGrid mode="question" messages={state.messages} />
              )}
              {role === 'student' && state.step === 2 && (
                <StudentInput step={state.step} onSend={(material, text) => post('questions', { student_name: name, material, text })} />
              )}
            </>
          )}
          {error && <p className="connection-error">{error}</p>}
        </section>
        
        {role === 'teacher' && <TeacherPanel step={state.step} votes={state.votes} messages={state.messages} onStep={(step) => post(`step/${step}`)} onReset={resetSession} />}
      </main>
      
      {role === 'student' && <footer>선생님이 다음 단계로 이동하면 화면이 자동으로 바뀌어요. 🌟</footer>}

      {/* 2단계 학생 힌트 팝업 모달 */}
      {showHint && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '20px', textAlign: 'center', width: '85%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h2 style={{ color: '#e17055', marginTop: 0, marginBottom: '20px', fontSize: '1.5rem' }}>💡 질문 만들기 꿀팁</h2>
            
            <div style={{ textAlign: 'left', lineHeight: '1.6', fontSize: '1.05rem', color: '#2d3436', backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '10px' }}>
              <p style={{ margin: '0 0 12px 0' }}><strong>1. 느낌 물어보기</strong><br/>"연필로 칠하니까 <b>[어떤 느낌]</b>이 나는데 왜 그럴까?"</p>
              <p style={{ margin: '0 0 12px 0' }}><strong>2. 차이점 찾기</strong><br/>"사인펜은 색연필과 다르게 왜 더 <b>[특징]</b>할까?"</p>
              <p style={{ margin: 0 }}><strong>3. 해시태그(#)도 좋아요!</strong><br/><span style={{ color: '#0984e3' }}>#사각사각 #미끌미끌 #부드러워요</span></p>
            </div>

            <button 
              onClick={() => setShowHint(false)} 
              style={{ marginTop: '25px', padding: '12px 30px', fontSize: '1.1rem', backgroundColor: '#dfe6e9', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              확인했어요
            </button>
          </div>
        </div>
      )}
    </div>
  )
}