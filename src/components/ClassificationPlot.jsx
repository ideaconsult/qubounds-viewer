import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ErrorBar, ReferenceLine
} from 'recharts'
import styles from './IntervalPlot.module.css' // reuse same styles

// points: [{ rank, predClass, setMin, setMax, setSize, trueClass, covered, compoundId, compoundName }]
// sorted by setSize ascending
export default function ClassificationPlot({ method, units, points, coverage, stats, classLabels, classValues }) {
  if (!points || points.length === 0) return null

  // Map a numeric class code to its label when model metadata provides one.
  // classValues (codes) align 1:1 with classLabels; if absent, assume codes 1..N.
  const classLabel = (v) => {
    if (v == null || !classLabels?.length) return v
    if (classValues?.length) {
      const i = classValues.findIndex(cv => String(cv) === String(v))
      return i >= 0 ? classLabels[i] : v
    }
    return classLabels[Math.round(v) - 1] ?? v
  }

  const sorted = [...points].sort((a, b) => a.setSize - b.setSize)
    .map((p, i) => ({ ...p, rank: i }))

  // Grey bars: span from setMin to setMax class value
  const barPoints = sorted.map(p => ({
    rank: p.rank,
    mid: (p.setMin + p.setMax) / 2,
    errorY: [(p.setMin + p.setMax) / 2 - p.setMin, p.setMax - (p.setMin + p.setMax) / 2],
    setSize: p.setSize
  }))

  // Predicted class (orange)
  const predPoints = sorted.map(p => ({ rank: p.rank, cls: p.predClass }))

  // True covered (blue) and missed (red)
  const coveredPoints = sorted.filter(p => p.trueClass != null && p.covered !== false)
    .map(p => ({ rank: p.rank, cls: p.trueClass }))
  const missedPoints = sorted.filter(p => p.trueClass != null && p.covered === false)
    .map(p => ({ rank: p.rank, cls: p.trueClass }))

  // Set size change boundaries for reference lines
  const boundaries = []
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].setSize !== sorted[i - 1].setSize) {
      boundaries.push({ x: i - 0.5, size: sorted[i].setSize })
    }
  }

  const allClasses = sorted.flatMap(p => [p.setMin, p.setMax, p.predClass, p.trueClass])
    .filter(v => v != null)
  const yMin = Math.min(...allClasses) - 0.5
  const yMax = Math.max(...allClasses) + 0.5

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    const orig = sorted[d?.rank]
    if (!orig) return null
    return (
      <div className={styles.tooltip}>
        <div className={styles.ttName}>{orig.compoundName || orig.compoundId || `#${orig.rank}`}</div>
        {orig.compoundName && orig.compoundId && (
          <div className={styles.ttId}>{orig.compoundId}</div>
        )}
        <div className={styles.ttRow}><span>Predicted class</span><span>{classLabel(orig.predClass)}</span></div>
        <div className={styles.ttRow}>
          <span>Prediction set</span>
          <span>{orig.predictionSet ? `{${orig.predictionSet.map(classLabel).join(', ')}}` : `[${orig.setMin}–${orig.setMax}]`}</span>
        </div>
        <div className={styles.ttRow}><span>Set size</span><span>{orig.setSize}</span></div>
        {orig.trueClass != null && (
          <div className={styles.ttRow}><span>True class</span><span>{classLabel(orig.trueClass)}</span></div>
        )}
      </div>
    )
  }

  return (
    <div className={styles.plotWrap}>
      <div className={styles.plotHeader}>
        <span className={styles.methodName}>{method}</span>
        <div className={styles.plotMeta}>
          {coverage != null && (
            <span className={styles.metaBadge}>coverage {(coverage * 100).toFixed(1)}%</span>
          )}
          {stats && Object.entries(stats).map(([k, v]) => (
            <span key={k} className={styles.metaBadge}>{k}: {v}</span>
          ))}
          <span className={styles.metaN}>{sorted.length} compounds</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="rank"
            type="number"
            domain={[0, sorted.length - 1]}
            label={{
              value: 'Molecules ranked by increasing prediction set size →',
              position: 'insideBottom',
              offset: -18,
              fill: 'var(--c-text-muted)',
              fontSize: 11
            }}
            tick={{ fill: 'var(--c-text-dim)', fontSize: 10 }}
            tickLine={false}
          />
          <YAxis
            dataKey="mid"
            type="number"
            domain={[yMin, yMax]}
            label={{
              value: 'Class',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              fill: 'var(--c-text-muted)',
              fontSize: 11
            }}
            tick={{ fill: 'var(--c-text-dim)', fontSize: 10 }}
            tickLine={false}
            allowDecimals={false}
            tickFormatter={v => (Number.isInteger(v) ? classLabel(v) : '')}
            width={classLabels?.length ? 90 : 40}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Set size boundary lines */}
          {boundaries.map(b => (
            <ReferenceLine
              key={b.x}
              x={b.x}
              stroke="var(--c-text-dim)"
              strokeDasharray="4 3"
              label={{
                value: `set size=${b.size}`,
                fill: 'var(--c-text-dim)',
                fontSize: 9,
                position: 'top'
              }}
            />
          ))}

          {/* Grey bars = prediction set span */}
          <Scatter
            name="Prediction set span"
            data={barPoints}
            fill="rgba(136,146,170,0.15)"
            stroke="var(--c-interval-stroke)"
            strokeWidth={1}
            r={0}
          >
            <ErrorBar
              dataKey="errorY"
              width={4}
              strokeWidth={8}
              stroke="rgba(136,146,170,0.22)"
              direction="y"
            />
          </Scatter>

          {/* Predicted class - orange */}
          <Scatter
            name="Predicted class ŷ"
            data={predPoints.map(p => ({ ...p, pred: p.cls }))}
            dataKey="pred"
            fill="var(--c-pred)"
            stroke="var(--c-pred)"
            strokeWidth={1.5}
            r={4}
          />

          {/* True covered - blue */}
          {coveredPoints.length > 0 && (
            <Scatter
              name="True (covered)"
              data={coveredPoints.map(p => ({ ...p, pred: p.cls }))}
              dataKey="pred"
              fill="var(--c-covered)"
              stroke="var(--c-covered)"
              r={4}
            />
          )}

          {/* True missed - red × */}
          {missedPoints.length > 0 && (
            <Scatter
              name="True (missed)"
              data={missedPoints.map(p => ({ ...p, pred: p.cls }))}
              dataKey="pred"
              fill="var(--c-missed)"
              stroke="var(--c-missed)"
              r={5}
            />
          )}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
