import { useLayoutEffect, useMemo, useRef, useState } from 'react'
type WordItem = { word: string; count: number }
type Placement = { left: number; top: number; fontSize: number }
type Rect = { left: number; top: number; width: number; height: number }
type Props = { words: Record<string, number> }
const SAFE_GAP = 8
const EDGE_GAP = 10
const MIN_SCALE = 0.42
const labelFor = (word: string) => `#${word.replace(/^#+/, '')}`
const overlaps = (candidate: Rect, placed: Rect[]) => placed.some((item) =>
  candidate.left < item.left + item.width + SAFE_GAP &&
  candidate.left + candidate.width + SAFE_GAP > item.left &&
  candidate.top < item.top + item.height + SAFE_GAP &&
  candidate.top + candidate.height + SAFE_GAP > item.top,
)
const findPosition = (index: number, width: number, height: number, areaWidth: number, areaHeight: number, placed: Rect[]) => {
  const minLeft = EDGE_GAP
  const minTop = EDGE_GAP
  const maxLeft = areaWidth - width - EDGE_GAP
  const maxTop = areaHeight - height - EDGE_GAP
  // 좌표를 계산하기 전에 글자 상자가 내부 안전 영역에 들어가는지 확인합니다.
  if (maxLeft < minLeft || maxTop < minTop) return null
  const tryPosition = (left: number, top: number) => {
    const boundedLeft = Math.max(minLeft, Math.min(maxLeft, left))
    const boundedTop = Math.max(minTop, Math.min(maxTop, top))
    const candidate = { left: boundedLeft, top: boundedTop, width, height }
    return overlaps(candidate, placed) ? null : candidate
  }
  const centerX = (areaWidth - width) / 2
  const centerY = (areaHeight - height) / 2
  if (index === 0) return tryPosition(centerX, centerY)
  const startAngle = -Math.PI / 2 + index * 1.31
  const maxRadius = Math.hypot(areaWidth, areaHeight)
  for (let radius = 10; radius <= maxRadius; radius += 5) {
    const steps = Math.max(36, Math.ceil((Math.PI * 2 * radius) / 6))
    for (let step = 0; step < steps; step += 1) {
      const angle = startAngle + (step / steps) * Math.PI * 2
      const position = tryPosition(
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius * 0.72,
      )
      if (position) return position
    }
  }
  return null
}
export default function WordCloud({ words }: Props) {
  const cloudRef = useRef<HTMLDivElement>(null)
  const measureRefs = useRef<Array<HTMLSpanElement | null>>([])
  const [placements, setPlacements] = useState<Placement[] | null>(null)
  const items = useMemo<WordItem[]>(() => Object.entries(words)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word, 'ko')), [words])
  const signature = items.map((item) => `${item.word}:${item.count}`).join('|')
  const highest = items[0]?.count ?? 1
  const baseSizes = useMemo(() => items.map((item) => {
    const ratio = item.count / highest
    const frequencyPressure = Math.min(0.18, Math.log2(highest) * 0.04)
    return Math.max(0.7, Math.min(1.75, 0.68 + ratio * 0.84 + frequencyPressure))
  }), [items, highest])
  useLayoutEffect(() => {
    const cloud = cloudRef.current
    if (!cloud || items.length === 0) return
    let frame = 0
    const layout = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const area = cloud.getBoundingClientRect()
        const innerWidth = area.width - EDGE_GAP * 2
        const innerHeight = area.height - EDGE_GAP * 2
        if (innerWidth <= 0 || innerHeight <= 0) return
        const measurements = measureRefs.current.map((element) => {
          const rect = element?.getBoundingClientRect()
          return rect ? { width: rect.width, height: rect.height } : null
        })
        if (measurements.some((item) => !item || !item.width || !item.height)) return
        const placed: Rect[] = []
        const next: Placement[] = []
        for (let index = 0; index < measurements.length; index += 1) {
          const measured = measurements[index]!
          const maxScale = Math.min(1, innerWidth / measured.width, innerHeight / measured.height) * 0.985
          const minimumScale = Math.min(MIN_SCALE, maxScale)
          let scale = maxScale
          let position: Rect | null = null
          // 긴 단어와 좁은 화면은 먼저 축소하고, 빈 자리가 없을 때만 조금씩 더 줄입니다.
          while (scale >= minimumScale - 0.001 && !position) {
            const width = Math.ceil(measured.width * scale)
            const height = Math.ceil(measured.height * scale)
            position = findPosition(index, width, height, area.width, area.height, placed)
            if (!position) scale = Number((scale - 0.04).toFixed(3))
          }
          // 배치할 수 없는 경우에는 해당 단어를 표시하지 않습니다. 보이지 않는 단어도 경계를 넘지는 않습니다.
          if (!position) continue
          placed.push(position)
          next[index] = { left: position.left, top: position.top, fontSize: baseSizes[index] * scale }
        }
        setPlacements(next)
      })
    }
    setPlacements(null)
    layout()
    const observer = new ResizeObserver(layout)
    observer.observe(cloud)
    return () => { cancelAnimationFrame(frame); observer.disconnect() }
  }, [signature, items.length, baseSizes])
  return <div className={`word-cloud ${items.length === 0 ? 'word-cloud-empty' : ''}`} ref={cloudRef} aria-label="느낌 단어 워드클라우드">
    {items.length === 0 && <p className="word-cloud-guide">아직 느낌 단어가 없어요.<br />첫 번째로 남겨 볼까요?</p>}
    <div className="word-measure-layer" aria-hidden="true">
      {items.map((item, index) => <span key={item.word} className="word" ref={(element) => { measureRefs.current[index] = element }} style={{ fontSize: `${baseSizes[index]}rem` }}>{labelFor(item.word)}</span>)}
    </div>
    {items.map((item, index) => {
      const placement = placements?.[index]
      return <span
        className="word pop-in"
        key={item.word}
        title={`${item.count}회`}
        aria-label={`${labelFor(item.word)}, ${item.count}회`}
        style={{ fontSize: `${placement?.fontSize ?? baseSizes[index]}rem`, left: placement?.left ?? 0, top: placement?.top ?? 0, visibility: placement ? 'visible' : 'hidden' }}
      >{labelFor(item.word)}</span>
    })}
  </div>
}
