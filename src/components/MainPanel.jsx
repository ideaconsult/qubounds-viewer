import EndpointGroup from './EndpointGroup'
import { SSbD_LABELS } from '../utils/modelRegistry'
import styles from './MainPanel.module.css'

export default function MainPanel({ predictionTree, activeSSbD, loading, error, compounds }) {
  // Loading first — otherwise an empty-but-still-fetching state flashes the
  // alarming "No predictions" message before the data arrives.
  if (loading) {
    return (
      <div className={styles.empty}>
        <div className={styles.loader} />
        <div className={styles.emptyText}>Loading predictions…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.empty}>
        <div className={styles.errorIcon}>⚠</div>
        <div className={styles.emptyTitle}>Could not load predictions</div>
        <div className={styles.emptyText}>{error}</div>
      </div>
    )
  }

  if (!compounds.length) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>⬡</div>
        <div className={styles.emptyTitle}>No predictions to display</div>
        <div className={styles.emptyText}>
          Open this viewer from the search app, or pass prediction item ids in the URL,
          e.g. <code>?data_source=vega&amp;type=prediction&amp;item=&lt;id&gt;</code>.
        </div>
      </div>
    )
  }

  const visibleSSbD = Object.keys(predictionTree).filter(
    ssbd => activeSSbD.has(ssbd)
  )

  if (visibleSSbD.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyText}>No predictions found for selected compounds.</div>
      </div>
    )
  }

  return (
    <div className={styles.panel}>
      {visibleSSbD.map(ssbd => (
        <section key={ssbd} className={styles.ssbdSection}>
          <div className={styles.ssbdHeader}>
            <h2 className={styles.ssbdTitle}>{SSbD_LABELS[ssbd] || ssbd}</h2>
          </div>
          {Object.entries(predictionTree[ssbd]).map(([endpoint, modelEntries]) => (
            <EndpointGroup
              key={endpoint}
              ssbd={ssbd}
              endpoint={endpoint}
              modelEntries={modelEntries}
            />
          ))}
        </section>
      ))}
    </div>
  )
}
