/**
 * Med Adherence Drug List
 * Source: Medication_Adherence_Drug_List_QST (2025)
 *
 * This dataset contains all medications tracked for HEDIS/STARS Med Adherence measures:
 * - MAC: Medication Adherence for Cholesterol (Statins)
 * - MAD: Medication Adherence for Diabetes
 * - MAH: Medication Adherence for Hypertension (RAS Antagonists)
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type MedAdherenceMeasure = 'MAC' | 'MAD' | 'MAH';

export interface DrugDefinition {
  generic: string;
  brand: string;
  strengths?: string[];
  note?: string;
}

export interface CombinationDrug {
  generic: string;
  brand: string;
  note?: string;
}

export interface FlattenedDrug {
  generic: string;
  brand: string;
  measure: MedAdherenceMeasure;
  subcategory: string;
  strengths: string[];
  note: string;
}

export interface CholesterolDrugs {
  measure: MedAdherenceMeasure;
  category: string;
  drugs: DrugDefinition[];
  combinations: CombinationDrug[];
}

export interface HypertensionDrugs {
  measure: MedAdherenceMeasure;
  category: string;
  aceInhibitors: DrugDefinition[];
  arbs: DrugDefinition[];
  directReninInhibitors: DrugDefinition[];
  combinations: CombinationDrug[];
}

export interface DiabetesDrugs {
  measure: MedAdherenceMeasure;
  category: string;
  biguanides: DrugDefinition[];
  sulfonylureas: DrugDefinition[];
  thiazolidinediones: DrugDefinition[];
  meglitinides: DrugDefinition[];
  dppivInhibitors: DrugDefinition[];
  sglt2Inhibitors: DrugDefinition[];
  glp1Agonists: DrugDefinition[];
  combinations: CombinationDrug[];
}

export interface MedAdherenceDrugs {
  cholesterol: CholesterolDrugs;
  hypertension: HypertensionDrugs;
  diabetes: DiabetesDrugs;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const MED_ADHERENCE_MEASURES = {
  MAC: 'MAC', // Cholesterol
  MAD: 'MAD', // Diabetes
  MAH: 'MAH', // Hypertension
} as const;

// ============================================================================
// MED ADHERENCE DRUG DATABASE
// ============================================================================

export const medAdherenceDrugs: MedAdherenceDrugs = {
  // MAC - Cholesterol Medications (Statins)
  cholesterol: {
    measure: MED_ADHERENCE_MEASURES.MAC,
    category: 'Cholesterol - Statins',
    drugs: [
      { generic: 'atorvastatin', brand: 'Lipitor', strengths: ['10mg', '20mg', '40mg', '80mg'] },
      { generic: 'rosuvastatin', brand: 'Crestor', strengths: ['5mg', '10mg', '20mg', '40mg'] },
      {
        generic: 'simvastatin',
        brand: 'Zocor',
        strengths: ['5mg', '10mg', '20mg', '40mg', '80mg'],
      },
      { generic: 'pravastatin', brand: 'Pravachol', strengths: ['10mg', '20mg', '40mg', '80mg'] },
      { generic: 'lovastatin', brand: 'Mevacor', strengths: ['10mg', '20mg', '40mg'] },
      { generic: 'lovastatin ER', brand: 'Altoprev ER', strengths: ['20mg', '40mg', '60mg'] },
      { generic: 'fluvastatin', brand: 'Lescol', strengths: ['20mg', '40mg'] },
      { generic: 'fluvastatin ER', brand: 'Lescol XL', strengths: ['80mg'] },
      { generic: 'pitavastatin', brand: 'Livalo/Zypitamag', strengths: ['1mg', '2mg', '4mg'] },
      {
        generic: 'simvastatin suspension',
        brand: 'Flolipid Susp',
        strengths: ['20mg/5mL', '40mg/5mL'],
      },
    ],
    combinations: [
      { generic: 'atorvastatin/amlodipine', brand: 'Caduet', note: 'Statin + BP med' },
      { generic: 'atorvastatin/ezetimibe', brand: 'Liptruzet', note: 'Statin combo' },
      { generic: 'ezetimibe/simvastatin', brand: 'Vytorin', note: 'Statin combo' },
      { generic: 'ezetimibe/rosuvastatin', brand: 'Roszet', note: 'Statin combo' },
      { generic: 'niacin/lovastatin ER', brand: 'Advicor', note: 'Statin combo' },
      { generic: 'niacin/simvastatin ER', brand: 'Simcor', note: 'Statin combo' },
      { generic: 'simvastatin/sitagliptin', brand: 'Juvisync', note: 'Statin + diabetes med' },
    ],
  },

  // MAH - Hypertension Medications (ACE Inhibitors, ARBs, DRIs)
  hypertension: {
    measure: MED_ADHERENCE_MEASURES.MAH,
    category: 'Hypertension - RAS Antagonists',
    aceInhibitors: [
      {
        generic: 'lisinopril',
        brand: 'Prinivil/Zestril',
        strengths: ['2.5mg', '5mg', '10mg', '20mg', '30mg', '40mg'],
      },
      { generic: 'enalapril', brand: 'Vasotec', strengths: ['2.5mg', '5mg', '10mg', '20mg'] },
      { generic: 'benazepril', brand: 'Lotensin', strengths: ['5mg', '10mg', '20mg', '40mg'] },
      { generic: 'ramipril', brand: 'Altace', strengths: ['1.25mg', '2.5mg', '5mg', '10mg'] },
      { generic: 'quinapril', brand: 'Accupril', strengths: ['5mg', '10mg', '20mg', '40mg'] },
      { generic: 'fosinopril', brand: 'Monopril', strengths: ['10mg', '20mg', '40mg'] },
      { generic: 'perindopril', brand: 'Aceon', strengths: ['2mg', '4mg', '8mg'] },
      { generic: 'trandolapril', brand: 'Mavik', strengths: ['1mg', '2mg', '4mg'] },
      { generic: 'moexipril', brand: 'Univasc', strengths: ['7.5mg', '15mg'] },
      { generic: 'captopril', brand: 'Capoten', strengths: ['12.5mg', '25mg', '50mg', '100mg'] },
    ],
    arbs: [
      { generic: 'losartan', brand: 'Cozaar', strengths: ['25mg', '50mg', '100mg'] },
      { generic: 'valsartan', brand: 'Diovan', strengths: ['40mg', '80mg', '160mg', '320mg'] },
      { generic: 'irbesartan', brand: 'Avapro', strengths: ['75mg', '150mg', '300mg'] },
      { generic: 'olmesartan', brand: 'Benicar', strengths: ['5mg', '20mg', '40mg'] },
      { generic: 'telmisartan', brand: 'Micardis', strengths: ['20mg', '40mg', '80mg'] },
      { generic: 'candesartan', brand: 'Atacand', strengths: ['4mg', '8mg', '16mg', '32mg'] },
      { generic: 'azilsartan', brand: 'Edarbi', strengths: ['40mg', '80mg'] },
      { generic: 'eprosartan', brand: 'Teveten', strengths: ['600mg'] },
    ],
    directReninInhibitors: [
      { generic: 'aliskiren', brand: 'Tekturna', strengths: ['150mg', '300mg'] },
    ],
    combinations: [
      // ACE combos
      { generic: 'lisinopril/HCTZ', brand: 'Zestoretic/Prinzide', note: 'ACE + diuretic' },
      { generic: 'enalapril/HCTZ', brand: 'Vaseretic', note: 'ACE + diuretic' },
      { generic: 'benazepril/HCTZ', brand: 'Lotensin HCT', note: 'ACE + diuretic' },
      { generic: 'amlodipine/benazepril', brand: 'Lotrel', note: 'ACE + CCB' },
      // ARB combos
      { generic: 'losartan/HCTZ', brand: 'Hyzaar', note: 'ARB + diuretic' },
      { generic: 'valsartan/HCTZ', brand: 'Diovan HCT', note: 'ARB + diuretic' },
      { generic: 'amlodipine/valsartan', brand: 'Exforge', note: 'ARB + CCB' },
      { generic: 'amlodipine/olmesartan', brand: 'Azor', note: 'ARB + CCB' },
    ],
  },

  // MAD - Diabetes Medications
  diabetes: {
    measure: MED_ADHERENCE_MEASURES.MAD,
    category: 'Diabetes Medications',
    biguanides: [
      { generic: 'metformin', brand: 'Glucophage', strengths: ['500mg', '850mg', '1000mg'] },
      { generic: 'metformin ER', brand: 'Glucophage XR', strengths: ['500mg', '750mg'] },
      { generic: 'metformin ER (Osmotic)', brand: 'Fortamet', strengths: ['500mg', '1000mg'] },
      { generic: 'metformin ER (Modified)', brand: 'Glumetza', strengths: ['500mg', '1000mg'] },
    ],
    sulfonylureas: [
      { generic: 'glipizide', brand: 'Glucotrol', strengths: ['5mg', '10mg'] },
      { generic: 'glipizide ER', brand: 'Glucotrol XL', strengths: ['2.5mg', '5mg', '10mg'] },
      { generic: 'glyburide', brand: 'Diabeta', strengths: ['1.25mg', '2.5mg', '5mg'] },
      { generic: 'glimepiride', brand: 'Amaryl', strengths: ['1mg', '2mg', '4mg'] },
      { generic: 'tolazamide', brand: 'Tolinase', strengths: ['250mg', '500mg'] },
      { generic: 'tolbutamide', brand: 'Tol-Tab', strengths: ['500mg'] },
    ],
    thiazolidinediones: [
      { generic: 'pioglitazone', brand: 'Actos', strengths: ['15mg', '30mg', '45mg'] },
      {
        generic: 'rosiglitazone',
        brand: 'Avandia',
        strengths: ['2mg', '4mg', '8mg'],
        note: 'Brand only',
      },
    ],
    meglitinides: [
      { generic: 'repaglinide', brand: 'Prandin', strengths: ['0.5mg', '1mg', '2mg'] },
      { generic: 'nateglinide', brand: 'Starlix', strengths: ['60mg', '120mg'] },
    ],
    dppivInhibitors: [
      {
        generic: 'sitagliptin',
        brand: 'Januvia',
        strengths: ['25mg', '50mg', '100mg'],
        note: 'Brand only',
      },
      { generic: 'saxagliptin', brand: 'Onglyza', strengths: ['2.5mg', '5mg'] },
      { generic: 'linagliptin', brand: 'Tradjenta', strengths: ['5mg'], note: 'Brand only' },
      { generic: 'alogliptin', brand: 'Nesina', strengths: ['6.25mg', '12.5mg', '25mg'] },
    ],
    sglt2Inhibitors: [
      {
        generic: 'empagliflozin',
        brand: 'Jardiance',
        strengths: ['10mg', '25mg'],
        note: 'Brand only',
      },
      {
        generic: 'canagliflozin',
        brand: 'Invokana',
        strengths: ['100mg', '300mg'],
        note: 'Brand only',
      },
      {
        generic: 'dapagliflozin',
        brand: 'Farxiga',
        strengths: ['5mg', '10mg'],
        note: 'Brand only',
      },
      {
        generic: 'ertugliflozin',
        brand: 'Steglatro',
        strengths: ['5mg', '15mg'],
        note: 'Brand only',
      },
    ],
    glp1Agonists: [
      { generic: 'liraglutide', brand: 'Victoza', strengths: ['18mg/3mL'], note: 'Brand only' },
      {
        generic: 'dulaglutide',
        brand: 'Trulicity',
        strengths: ['0.75mg/0.5mL', '1.5mg/0.5mL'],
        note: 'Brand only',
      },
      {
        generic: 'semaglutide injection',
        brand: 'Ozempic',
        strengths: ['2mg/1.5mL', '8mg/3mL'],
        note: 'Brand only',
      },
      {
        generic: 'semaglutide tablet',
        brand: 'Rybelsus',
        strengths: ['3mg', '7mg', '14mg'],
        note: 'Brand only',
      },
      { generic: 'exenatide', brand: 'Byetta', strengths: ['250mcg/1mL'], note: 'Brand only' },
      { generic: 'exenatide ER', brand: 'Bydureon', strengths: ['2mg'], note: 'Brand only' },
      {
        generic: 'tirzepatide',
        brand: 'Mounjaro',
        strengths: ['2.5mg-15mg/0.5mL'],
        note: 'Brand only, GIP/GLP-1',
      },
    ],
    combinations: [
      // Metformin combos
      { generic: 'sitagliptin/metformin', brand: 'Janumet', note: 'DPP-IV + metformin' },
      { generic: 'linagliptin/metformin', brand: 'Jentadueto', note: 'DPP-IV + metformin' },
      { generic: 'alogliptin/metformin', brand: 'Kazano', note: 'DPP-IV + metformin' },
      { generic: 'empagliflozin/metformin', brand: 'Synjardy', note: 'SGLT2 + metformin' },
      { generic: 'canagliflozin/metformin', brand: 'Invokamet', note: 'SGLT2 + metformin' },
      { generic: 'dapagliflozin/metformin ER', brand: 'Xigduo XR', note: 'SGLT2 + metformin' },
      { generic: 'glipizide/metformin', brand: 'Metaglip', note: 'Sulfonylurea + metformin' },
      { generic: 'glyburide/metformin', brand: 'Glucovance', note: 'Sulfonylurea + metformin' },
      { generic: 'pioglitazone/metformin', brand: 'Actoplus Met', note: 'TZD + metformin' },
    ],
  },
};

// ============================================================================
// FLATTENED DRUG LIST
// ============================================================================

/**
 * Flat list of all Med Adherence medications for quick lookup
 * Includes generic names, brand names, and measure mapping
 */
export const flattenedMedAdherenceDrugs: FlattenedDrug[] = (() => {
  const result: FlattenedDrug[] = [];

  // Helper to add drugs from a category
  const addDrugs = (
    drugs: (DrugDefinition | CombinationDrug)[],
    measure: MedAdherenceMeasure,
    subcategory: string = ''
  ) => {
    drugs.forEach((drug) => {
      result.push({
        generic: drug.generic,
        brand: drug.brand,
        measure,
        subcategory,
        strengths: 'strengths' in drug ? drug.strengths || [] : [],
        note: drug.note || '',
      });
    });
  };

  // Add cholesterol drugs
  addDrugs(medAdherenceDrugs.cholesterol.drugs, MED_ADHERENCE_MEASURES.MAC, 'Statins');
  addDrugs(
    medAdherenceDrugs.cholesterol.combinations,
    MED_ADHERENCE_MEASURES.MAC,
    'Statin Combinations'
  );

  // Add hypertension drugs
  addDrugs(
    medAdherenceDrugs.hypertension.aceInhibitors,
    MED_ADHERENCE_MEASURES.MAH,
    'ACE Inhibitors'
  );
  addDrugs(medAdherenceDrugs.hypertension.arbs, MED_ADHERENCE_MEASURES.MAH, 'ARBs');
  addDrugs(
    medAdherenceDrugs.hypertension.directReninInhibitors,
    MED_ADHERENCE_MEASURES.MAH,
    'Direct Renin Inhibitors'
  );
  addDrugs(medAdherenceDrugs.hypertension.combinations, MED_ADHERENCE_MEASURES.MAH, 'Combinations');

  // Add diabetes drugs
  addDrugs(medAdherenceDrugs.diabetes.biguanides, MED_ADHERENCE_MEASURES.MAD, 'Biguanides');
  addDrugs(medAdherenceDrugs.diabetes.sulfonylureas, MED_ADHERENCE_MEASURES.MAD, 'Sulfonylureas');
  addDrugs(
    medAdherenceDrugs.diabetes.thiazolidinediones,
    MED_ADHERENCE_MEASURES.MAD,
    'Thiazolidinediones'
  );
  addDrugs(medAdherenceDrugs.diabetes.meglitinides, MED_ADHERENCE_MEASURES.MAD, 'Meglitinides');
  addDrugs(
    medAdherenceDrugs.diabetes.dppivInhibitors,
    MED_ADHERENCE_MEASURES.MAD,
    'DPP-IV Inhibitors'
  );
  addDrugs(
    medAdherenceDrugs.diabetes.sglt2Inhibitors,
    MED_ADHERENCE_MEASURES.MAD,
    'SGLT2 Inhibitors'
  );
  addDrugs(medAdherenceDrugs.diabetes.glp1Agonists, MED_ADHERENCE_MEASURES.MAD, 'GLP-1 Agonists');
  addDrugs(medAdherenceDrugs.diabetes.combinations, MED_ADHERENCE_MEASURES.MAD, 'Combinations');

  return result;
})();

// ============================================================================
// SEARCH INDEX
// ============================================================================

/**
 * Search index for quick medication lookup (case-insensitive)
 */
export const medAdherenceSearchIndex = new Map(
  flattenedMedAdherenceDrugs.flatMap((drug) => [
    [drug.generic.toLowerCase(), drug],
    [drug.brand.toLowerCase(), drug],
    // Also add without spaces/hyphens for better matching
    [drug.generic.toLowerCase().replace(/[\s-]/g, ''), drug],
    [drug.brand.toLowerCase().replace(/[\s-]/g, ''), drug],
  ])
);

// Log loaded count in development
if (process.env.NODE_ENV === 'development') {
  // eslint-disable-next-line no-console
  console.log(`Med Adherence Drug List loaded: ${flattenedMedAdherenceDrugs.length} medications`);
}
