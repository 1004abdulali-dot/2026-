import { useState } from 'react'
import { MATERIALS } from './MaterialGrid'

type Props = { step: number; onSend: (material: string, text: string) => Promise<void> }
export default function StudentInput({ step, onSend }: Props) {
  const [material, setMaterial] = useState('연필'); const [text, setText] = useState(''); const [error, setError] = useState(''); const [sending, setSending] = useState(false)
  const label = step === 2 ? '궁금한 점을 적어 보세요' : '느낌을 한두 단어로 적어 보세요'
  const send = async () => { if (!text.trim()) { setError('내용을 먼저 적어 주세요!'); return } setSending(true); setError(''); try { await onSend(material, text.trim()); setText('') } catch { setError('전송이 잘 되지 않았어요. 다시 눌러 주세요.') } finally { setSending(false) } }
  return <section className="student-input"><div><label htmlFor="message"><b>{step === 2 ? '💬 질문 남기기' : '✨ 느낌 단어 남기기'}</b><span>{label}</span></label><input id="message" maxLength={60} value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') send() }} placeholder={step === 2 ? '예: 왜 색이 진하게 나올까요?' : '예: 부드러움'} /></div><div className="material-pills" aria-label="재료 선택">{MATERIALS.map((item) => <button className={material === item.name ? 'active' : ''} onClick={() => setMaterial(item.name)} key={item.name}>{item.icon}<span>{item.name}</span></button>)}</div><button className="send-button" onClick={send} disabled={sending}>{sending ? '보내는 중…' : '전송하기 🚀'}</button>{error && <p className="form-error">{error}</p>}</section>
}
