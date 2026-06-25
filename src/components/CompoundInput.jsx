import { useState, useRef } from 'react'
import { useCompoundSearch } from '../hooks/useSolr'
import styles from './CompoundInput.module.css'

export default function CompoundInput({ selectedCompounds, onAdd, onRemove }) {
  const [query, setQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const fileRef = useRef()
  const { search, results, loading } = useCompoundSearch()

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      search(query.trim())
      setShowDropdown(true)
    }
  }

  const handleSelect = (compound) => {
    onAdd(compound)
    setQuery('')
    setShowDropdown(false)
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const lines = ev.target.result.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
      // Each line is an identifier — search each one
      lines.forEach(id => {
        search(id)
        // Results are async; we handle them via a separate batch flow
      })
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const alreadySelected = (id) => selectedCompounds.some(c => c.id === id)

  return (
    <div className={styles.wrapper}>
      <div className={styles.inputRow}>
        <div className={styles.inputWrap}>
          <span className={styles.icon}>⌕</span>
          <input
            className={styles.input}
            placeholder="CAS, DTXSID, SMILES, InChIKey, name…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => results.length && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          />
          {loading && <span className={styles.spinner}>·</span>}
        </div>
        <button
          className={styles.uploadBtn}
          title="Upload list (CSV / TXT)"
          onClick={() => fileRef.current.click()}
        >
          ↑ List
        </button>
        <input ref={fileRef} type="file" accept=".csv,.txt" hidden onChange={handleFileUpload} />
      </div>

      {showDropdown && results.length > 0 && (
        <ul className={styles.dropdown}>
          {results.map(c => (
            <li
              key={c.id}
              className={`${styles.dropItem} ${alreadySelected(c.id) ? styles.already : ''}`}
              onMouseDown={() => !alreadySelected(c.id) && handleSelect(c)}
            >
              <span className={styles.dropName}>{c.text || c.id}</span>
              <span className={styles.dropId}>{decodeURIComponent(c.id)}</span>
              {alreadySelected(c.id) && <span className={styles.addedBadge}>added</span>}
            </li>
          ))}
        </ul>
      )}

      {selectedCompounds.length > 0 && (
        <div className={styles.chips}>
          {selectedCompounds.map(c => (
            <span key={c.id} className={styles.chip}>
              <span className={styles.chipName}>{c.text || c.id}</span>
              <button className={styles.chipRemove} onClick={() => onRemove(c.id)}>×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
