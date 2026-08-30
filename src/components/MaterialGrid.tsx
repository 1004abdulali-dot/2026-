import WordCloud from './WordCloud'
export const MATERIALS = [
  { name: '연필', icon: '✏️', className: 'pencil', hint: '차분하고 부드러운 선' },
  { name: '볼펜', icon: '🖊️', className: 'pen', hint: '또렷하고 매끈한 선' },
  { name: '색연필', icon: '🖍️', className: 'colored', hint: '포근하게 겹치는 색' },
  { name: '사인펜', icon: '🖋️', className: 'marker', hint: '쨍하고 선명한 색' },
]
type Message = { id: number; student_name: string; kind: string; material: string; text: string }
type Props = { mode: 'question' | 'keyword'; messages: Message[] }
export default function MaterialGrid({ mode, messages }: Props) {
  const relevant = messages.filter((message) => message.kind === mode)
  return <section className="material-grid" aria-label={mode === 'question' ? '질문 게시판' : '느낌 단어 모음'}>
    {MATERIALS.map((material) => {
      const entries = relevant.filter((message) => message.material === material.name)
      const words = entries.reduce<Record<string, number>>((result, item) => {
        const word = item.text.trim().replace(/^#+/, '')
        if (word) result[word] = (result[word] || 0) + 1
        return result
      }, {})
      return <article className={`quadrant ${material.className}`} key={material.name}>
        <header className="quadrant-title"><span>{material.icon}</span><div><h3>{material.name}</h3><p>{material.hint}</p></div></header>
        <div className={mode === 'question' ? 'bubble-space' : 'word-space'}>
          {mode === 'question' && entries.map((entry) => <div className="speech-bubble pop-in" key={entry.id}><b>{entry.student_name}</b><span>{entry.text}</span></div>)}
          {mode === 'keyword' && <WordCloud words={words} />}
          {mode === 'question' && entries.length === 0 && <p className="space-empty">아직 질문이 없어요.<br />첫 번째로 남겨 볼까요?</p>}
        </div>
      </article>
    })}
  </section>
}
