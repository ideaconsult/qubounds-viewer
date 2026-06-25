import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, ErrorBar, Legend
} from 'recharts'
import styles from './IntervalPlot.module.css'

// points: [{ rank, pred, lower, upper, intervalWidth, compoundId, compoundName, covered, label }]
// sorted by intervalWidth ascending (matching qubounds plot convention)
export default function IntervalPlot({ method, endpoint, units, points, meanWidth, coverage }) {
  if (!points || points.length === 0) return null

  // Sort by interval width ascending
  const sorted = [...points].sort((a, b) => a.intervalWidth - b.intervalWidth)
    .map((p, i) => ({ ...p, rank: i }))

  const covered   = sorted.filter(p => p.covered !== false)
  const missed    = sorted.filter(p => p.covered === false)
  // All points: prediction ± interval
  const predPoints = sorted.map(p => ({
    rank: p.rank,
    pred: p.pred,
    errorY: [p.pred - p.lower, p.upper - p.pred],
    label: p.compoundName || p.compoundId || `#${p.rank}`
  }))

  const allVals = sorted.flatMap(p => [p.lower, p.upper, p.pred]).filter(v => v != null)
  const yMin = Math.floor(Math.min(...allVals) - 0.5)
  const yMax = Math.ceil(Math.max(...allVals) + 0.5)

  // y-axis label: "<endpoint> (<unit>)" when available, else whatever we have
  const yLabel = [endpoint, units && `(${units})`].filter(Boolean).join(' ') || 'predicted value'

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    if (!d) return null
    const orig = sorted[d.rank]
    return (
      <div className={styles.tooltip}>
        <div className={styles.ttName}>{orig?.compoundName || orig?.compoundId || `#${d.rank}`}</div>
        {orig?.compoundId && orig?.compoundName && (
          <div className={styles.ttId}>{orig.compoundId}</div>
        )}
        <div className={styles.ttRow}>
          <span>Predicted</span>
          <span>{d.pred?.toFixed(3)} {units}</span>
        </div>
        <div className={styles.ttRow}>
          <span>Interval</span>
          <span>[{orig?.lower?.toFixed(3)}, {orig?.upper?.toFixed(3)}]</span>
        </div>
        <div className={styles.ttRow}>
          <span>Width</span>
          <span>{orig?.intervalWidth?.toFixed(3)}</span>
        </div>
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
          {meanWidth != null && (
            <span className={styles.metaBadge}>mean width {meanWidth.toFixed(3)}</span>
          )}
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
              value: 'Molecules ranked by increasing interval width →',
              position: 'insideBottom',
              offset: -18,
              fill: 'var(--c-text-muted)',
              fontSize: 11
            }}
            tick={{ fill: 'var(--c-text-dim)', fontSize: 10 }}
            tickLine={false}
          />
          <YAxis
            dataKey="pred"
            domain={[yMin, yMax]}
            label={{
              value: yLabel,
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              fill: 'var(--c-text-muted)',
              fontSize: 11
            }}
            tick={{ fill: 'var(--c-text-dim)', fontSize: 10 }}
            tickLine={false}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Prediction ± interval — orange dots with grey error bars */}
          <Scatter
            name="Prediction ± CP interval"
            data={predPoints}
            fill="var(--c-pred)"
            stroke="var(--c-pred)"
            strokeWidth={1}
            r={4}
          >
            <ErrorBar
              dataKey="errorY"
              width={3}
              strokeWidth={1.2}
              stroke="var(--c-interval-stroke)"
              direction="y"
            />
          </Scatter>

          {/* True values if available — covered (blue) and missed (red) */}
          {covered.some(p => p.trueValue != null) && (
            <Scatter
              name="True (covered)"
              data={covered.filter(p => p.trueValue != null).map(p => ({ rank: p.rank, pred: p.trueValue }))}
              fill="var(--c-covered)"
              stroke="var(--c-covered)"
              r={4}
            />
          )}
          {missed.some(p => p.trueValue != null) && (
            <Scatter
              name="True (missed)"
              data={missed.filter(p => p.trueValue != null).map(p => ({ rank: p.rank, pred: p.trueValue }))}
              fill="var(--c-missed)"
              stroke="var(--c-missed)"
              shape="cross"
              r={5}
            />
          )}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
