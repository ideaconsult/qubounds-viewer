// Model registry: SSbD group -> endpoint category -> display metadata
// Built from vega_models_withclasses.xlsx taxonomy.
// Future platforms (OPERA, OCHEM) add new entries here or load dynamically.

export const SSbD_LABELS = {
  Acute_aquatic_toxicity: 'Acute Aquatic Toxicity',
  Carcinogenicity: 'Carcinogenicity',
  Chronic_aquatic_toxicity: 'Chronic Aquatic Toxicity',
  Endocrine_disruption: 'Endocrine Disruption',
  Eye_damage_irritation: 'Eye Damage / Irritation',
  Mutagenicity: 'Mutagenicity / Genotoxicity',
  'P-CHEM': 'Physicochemical Properties',
  PBT: 'PBT (Persistence, Bioaccumulation, Toxicity)',
  PMT: 'PMT (Persistence, Mobility, Toxicity)',
  Reproductive_toxicity: 'Reproductive & Developmental Toxicity',
  'STOT-RE': 'Repeated-dose Toxicity (STOT-RE)',
  'STOT-SE': 'Acute Systemic Toxicity (STOT-SE)',
  Skin_corrosion_irritation: 'Skin Corrosion / Irritation',
  Skin_sensitization: 'Skin Sensitisation',
  Toxicity: 'Other Toxicity'
}

export const ENDPOINT_LABELS = {
  EC_ALGAETOX_SECTION: 'Algae Toxicity',
  EC_DAPHNIATOX_SECTION: 'Daphnia Magna EC50',
  EC_CHRONDAPHNIATOX_SECTION: 'Daphnia Chronic NOEC',
  EC_CHRONFISHTOX_SECTION: 'Fish Chronic NOEC',
  EC_FISHTOX: 'Fish Acute Toxicity',
  EC_FISHTOX_SECTION: 'Fish Acute LC50',
  RECEPTOR_BINDING: 'Receptor Binding',
  TO_EYE_IRRITATION_SECTION: 'Eye Irritation',
  TO_GENETIC_IN_VITRO: 'In Vitro Genotoxicity',
  TO_GENETIC_IN_VIVO: 'In Vivo Genotoxicity',
  PC_MELTING_SECTION: 'Melting Point',
  PC_VAPOUR_SECTION: 'Vapour Pressure',
  PC_WATER_SOL_SECTION: 'Water Solubility',
  EN_BIOACCUMULATION_SECTION: 'Bioaccumulation (BCF)',
  EN_HENRY_LAW_SECTION: "Henry's Law Constant",
  TO_BIODEG_WATER_SCREEN_SECTION: 'Ready Biodegradability',
  TO_BIODEG_WATER_SIM_SECTION: 'Simulation Biodegradation',
  TO_HYDROLYSIS_SECTION: 'Hydrolysis',
  EC_SOIL_MICRO_TOX: 'Soil Microbial Toxicity',
  EC_SEDIMENTDWELLINGTOX_SECTION: 'Sediment Dwelling Toxicity',
  EN_ADSORPTION_SECTION: 'Soil Adsorption (KOC)',
  EN_STABILITY_IN_SOIL_SECTION: 'Stability in Soil',
  TO_PHOTOTRANS_AIR_SECTION: 'Phototransformation in Air',
  TO_DEVELOPMENTAL: 'Developmental Toxicity',
  TO_REPRODUCTION: 'Reproductive Toxicity',
  TO_REPEATED_ORAL: 'Repeated Oral Toxicity (LOAEL)',
  TO_ACUTE_DERMAL: 'Acute Dermal Toxicity',
  TO_ACUTE_ORAL_SECTION: 'Acute Oral Toxicity (LD50)',
  TO_SKIN_IRRITATION_SECTION: 'Skin Irritation',
  TO_SENSITIZATION_SECTION: 'Skin Sensitisation',
  EC_HONEYBEESTOX: 'Honeybee Toxicity',
  EC_SOILDWELLINGTOX: 'Soil Dwelling Toxicity',
  TO_CARCINOGENICITY: 'Carcinogenicity'
}

// Parse dynamic Solr fields like "FATHEAD_EPA_pred_d", "FATHEAD_EPA_lower90_d"
// Returns array of { method, pred, lower, upper } per compound doc
export function parseMethodPredictions(doc) {
  const methods = doc.attr_method || []
  return methods.map(method => ({
    method,
    pred: doc[`${method}_pred_d`] ?? null,
    lower: doc[`${method}_lower90_d`] ?? null,
    upper: doc[`${method}_upper90_d`] ?? null,
    intervalWidth: (doc[`${method}_upper90_d`] ?? 0) - (doc[`${method}_lower90_d`] ?? 0)
  })).filter(m => m.pred !== null)
}

// Group prediction docs by SSbD -> endpointcategory -> methods
export function groupPredictions(docs) {
  const tree = {}
  for (const doc of docs) {
    const ssbd = doc.reference_s || 'Unknown'
    const ep = doc.endpointcategory_s || 'Unknown'
    if (!tree[ssbd]) tree[ssbd] = {}
    if (!tree[ssbd][ep]) tree[ssbd][ep] = []
    const methodPreds = parseMethodPredictions(doc)
    for (const mp of methodPreds) {
      tree[ssbd][ep].push({ ...mp, doc })
    }
  }
  return tree
}
