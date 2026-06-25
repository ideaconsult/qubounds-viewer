// Build and trigger download of a CSV from the prediction tree
export function exportCSV(compounds, predictionTree, confidenceLevel) {
  const rows = []
  const header = [
    'compound_id', 'compound_name', 'casrn',
    'ssbd_group', 'endpoint', 'method', 'task_type',
    'confidence_level',
    'predicted_value', 'lower_bound', 'upper_bound', 'interval_width',
    'predicted_class', 'prediction_set', 'set_size',
    'domain_status'
  ]
  rows.push(header.join(','))

  const compMap = Object.fromEntries(compounds.map(c => [decodeURIComponent(c.id), c]))

  for (const [ssbd, eps] of Object.entries(predictionTree)) {
    for (const [endpoint, modelEntries] of Object.entries(eps)) {
      for (const entry of modelEntries) {
        for (const pt of (entry.points || [])) {
          const comp = compMap[pt.compoundId] || {}
          const row = [
            pt.compoundId || '',
            `"${(comp.text || '').replace(/"/g, '""')}"`,
            '',
            ssbd,
            endpoint,
            entry.method,
            entry.taskType,
            confidenceLevel,
            pt.pred ?? '',
            pt.lower ?? '',
            pt.upper ?? '',
            pt.intervalWidth ?? '',
            pt.predClass ?? '',
            pt.predictionSet ? `"${pt.predictionSet.join(';')}"` : '',
            pt.setSize ?? '',
            pt.domainStatus || ''
          ]
          rows.push(row.join(','))
        }
      }
    }
  }

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `qubounds_${confidenceLevel}_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
