import { useState } from 'react'
import IntervalPlot from './IntervalPlot'
import ClassificationPlot from './ClassificationPlot'
import { ENDPOINT_LABELS } from '../utils/modelRegistry'
import styles from './EndpointGroup.module.css'

// modelEntries: [{ method, taskType, points, units, meanWidth, coverage, stats, hsdsUrl }]
export default function EndpointGroup({ ssbd, endpoint, modelEntries }) {
  const [open, setOpen] = useState(true)

  if (!modelEntries || modelEntries.length === 0) return null

  // Prefer the data-driven endpoint label from model metadata; fall back to the
  // static registry, then the raw code.
  const label = modelEntries.find(e => e.endpointLabel)?.endpointLabel
    || ENDPOINT_LABELS[endpoint] || endpoint
  const totalCompounds = modelEntries[0]?.points?.length || 0

  return (
    <div className={styles.group}>
      <button className={styles.header} onClick={() => setOpen(o => !o)}>
        <span className={styles.arrow}>{open ? '▾' : '▸'}</span>
        <span className={styles.epLabel}>{label}</span>
        <span className={styles.meta}>
          {modelEntries.length} model{modelEntries.length !== 1 ? 's' : ''}
          {totalCompounds > 0 && ` · ${totalCompounds} compound${totalCompounds !== 1 ? 's' : ''}`}
        </span>
      </button>

      {open && (
        <div className={styles.plots}>
          {modelEntries.map(entry => (
            <div key={entry.method} className={styles.plotRow}>
              <div className={styles.plotMeta}>
                <span className="tag tag-platform">{entry.software || 'VEGA'}</span>
                {entry.domainSummary && (
                  <span className={`tag tag-${entry.domainSummary}`}>
                    {entry.domainSummary}
                  </span>
                )}
                {entry.hsdsUrl && (
                  <a
                    className={styles.h5btn}
                    href={entry.hsdsUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Open calibration data in h5web"
                    onClick={e => e.stopPropagation()}
                  >
                    h5
                  </a>
                )}
              </div>

              {entry.taskType === 'regression' ? (
                <IntervalPlot
                  method={entry.modelName || entry.method}
                  endpoint={label}
                  units={entry.units}
                  points={entry.points}
                  meanWidth={entry.meanWidth}
                  coverage={entry.coverage}
                />
              ) : (
                <ClassificationPlot
                  method={entry.modelName || entry.method}
                  units={entry.units}
                  points={entry.points}
                  coverage={entry.coverage}
                  stats={entry.stats}
                  classLabels={entry.classLabels}
                  classValues={entry.classValues}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
