import { useStructureUrl } from '../hooks/useSolr'
import { SSbD_LABELS } from '../utils/modelRegistry'
import styles from './Sidebar.module.css'

export default function Sidebar({
  compounds,
  predictionTree,
  activeSSbD,
  onToggleSSbD,
  confidenceLevel,
  onConfidenceChange,
  availableConfidenceLevels,
  hsdsBaseUrl
}) {
  const getImage = useStructureUrl()
  return (
    <aside className={styles.sidebar}>

      {/* Confidence level */}
      <section className={styles.section}>
        <div className={styles.sectionTitle}>Confidence level</div>
        <div className={styles.confButtons}>
          {availableConfidenceLevels.map(cl => (
            <button
              key={cl}
              className={`${styles.confBtn} ${confidenceLevel === cl ? styles.confActive : ''}`}
              onClick={() => onConfidenceChange(cl)}
            >
              {(cl * 100).toFixed(0)}%
            </button>
          ))}
        </div>
      </section>

      {/* Compound cards */}
      {compounds.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionTitle}>
            {compounds.length === 1 ? 'Compound' : `Compounds (${compounds.length})`}
          </div>
          <div className={styles.compoundCards}>
            {compounds.map(c => {
              const imgSrc = getImage(c)

              return (
                <div key={c.id} className={styles.compCard}>
                  {imgSrc && (
                    <img
                      className={styles.structure}
                      src={imgSrc}
                      alt={c.text || c.id}
                      loading="lazy"
                    />
                  )}

                  <div className={styles.compMeta}>
                    <div className={styles.compName}>{c.text || '—'}</div>
                    <div className={styles.compId}>{decodeURIComponent(c.id)}</div>
                    {c.hasPredictions === false && (
                      <div className={styles.compId} style={{ color: 'var(--c-missed)' }}>
                        no predictions
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Endpoint filter tree */}
      {Object.keys(predictionTree).length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionTitle}>Endpoints</div>
          <ul className={styles.epTree}>
            {Object.entries(predictionTree).map(([ssbd, eps]) => {
              const modelCount = Object.values(eps).reduce((a, ms) => a + ms.length, 0)
              return (
                <li key={ssbd}>
                  <button
                    className={`${styles.ssbd} ${activeSSbD.has(ssbd) ? styles.ssbdActive : ''}`}
                    onClick={() => onToggleSSbD(ssbd)}
                  >
                    <span className={styles.ssbdCheck}>{activeSSbD.has(ssbd) ? '▾' : '▸'}</span>
                    <span className={styles.ssbdLabel}>{SSbD_LABELS[ssbd] || ssbd}</span>
                    <span className={styles.ssbdCount}>{modelCount}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          <div className={styles.treeActions}>
            <button className={styles.treeAction} onClick={() => onToggleSSbD('__all__')}>all</button>
            <button className={styles.treeAction} onClick={() => onToggleSSbD('__none__')}>none</button>
          </div>
        </section>
      )}

      {/* h5web link */}
      {hsdsBaseUrl && (
        <section className={styles.section}>
          <a
            className={styles.h5Link}
            href={hsdsBaseUrl}
            target="_blank" rel="noreferrer"
          >
            🗄 Model calibration data (h5web)
          </a>
        </section>
      )}
    </aside>
  )
}
