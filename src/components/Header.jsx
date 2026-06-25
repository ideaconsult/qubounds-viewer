import styles from './Header.module.css'

export default function Header({ compounds, onExport, nambitUrl }) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <span className={styles.logo}>qu·bounds</span>
        <span className={styles.subtitle}>Conformal Prediction Intervals</span>
      </div>
      <div className={styles.right}>
        {compounds.length > 0 && (
          <button className={styles.exportBtn} onClick={onExport}>
            Export CSV
          </button>
        )}
        {nambitUrl && (
          <a className={styles.backLink} href={nambitUrl}>
            ← nambit
          </a>
        )}
        <a
          className={styles.ghLink}
          href="https://github.com/ideaconsult/qubounds"
          target="_blank" rel="noreferrer"
        >
          GitHub
        </a>
      </div>
    </header>
  )
}
