/**
 * FHIR Helper Tests
 *
 * TDD: Write tests FIRST, then implement to pass.
 *
 * @see docs/implementation/phase-1-core-engine/specs/05_FHIR_EXTENSIONS_SPEC.md
 */

import { describe, it, expect } from 'vitest';
import type { Extension } from '@medplum/fhirtypes';
import {
  getExtensionValue,
  setExtensionValue,
  hasExtension,
  removeExtension,
  getCodeExtension,
  getIntegerExtension,
  getBooleanExtension,
  getDecimalExtension,
  getPeriodExtension,
} from '../helpers';
import { OBSERVATION_EXTENSION_URLS, PATIENT_EXTENSION_URLS } from '../types';

// =============================================================================
// Test Fixtures
// =============================================================================

const mockObservationExtensions: Extension[] = [
  {
    url: OBSERVATION_EXTENSION_URLS.FRAGILITY_TIER,
    valueCode: 'F2_FRAGILE',
  },
  {
    url: OBSERVATION_EXTENSION_URLS.PRIORITY_SCORE,
    valueInteger: 105,
  },
  {
    url: OBSERVATION_EXTENSION_URLS.IS_CURRENT_PDC,
    valueBoolean: true,
  },
  {
    url: OBSERVATION_EXTENSION_URLS.MA_MEASURE,
    valueCode: 'MAC',
  },
  {
    url: OBSERVATION_EXTENSION_URLS.DAYS_UNTIL_RUNOUT,
    valueInteger: 5,
  },
  {
    url: OBSERVATION_EXTENSION_URLS.GAP_DAYS_REMAINING,
    valueInteger: 12,
  },
  {
    url: OBSERVATION_EXTENSION_URLS.DELAY_BUDGET,
    valueInteger: 4,
  },
  {
    url: OBSERVATION_EXTENSION_URLS.TREATMENT_PERIOD,
    valuePeriod: {
      start: '2025-01-15',
      end: '2025-12-31',
    },
  },
  {
    url: OBSERVATION_EXTENSION_URLS.Q4_ADJUSTED,
    valueBoolean: false,
  },
];

// =============================================================================
// getExtensionValue Tests
// =============================================================================

describe('getExtensionValue', () => {
  it('should return extension when URL matches', () => {
    const result = getExtensionValue(
      mockObservationExtensions,
      OBSERVATION_EXTENSION_URLS.FRAGILITY_TIER
    );

    expect(result).toBeDefined();
    expect(result?.valueCode).toBe('F2_FRAGILE');
  });

  it('should return undefined when URL not found', () => {
    const result = getExtensionValue(mockObservationExtensions, 'https://example.com/nonexistent');

    expect(result).toBeUndefined();
  });

  it('should return undefined for empty extensions array', () => {
    const result = getExtensionValue([], OBSERVATION_EXTENSION_URLS.FRAGILITY_TIER);

    expect(result).toBeUndefined();
  });

  it('should return undefined for undefined extensions', () => {
    const result = getExtensionValue(undefined, OBSERVATION_EXTENSION_URLS.FRAGILITY_TIER);

    expect(result).toBeUndefined();
  });
});

// =============================================================================
// getCodeExtension Tests
// =============================================================================

describe('getCodeExtension', () => {
  it('should return valueCode for code extension', () => {
    const result = getCodeExtension(
      mockObservationExtensions,
      OBSERVATION_EXTENSION_URLS.FRAGILITY_TIER
    );

    expect(result).toBe('F2_FRAGILE');
  });

  it('should return MA measure code', () => {
    const result = getCodeExtension(
      mockObservationExtensions,
      OBSERVATION_EXTENSION_URLS.MA_MEASURE
    );

    expect(result).toBe('MAC');
  });

  it('should return undefined if extension not found', () => {
    const result = getCodeExtension(mockObservationExtensions, 'https://example.com/nonexistent');

    expect(result).toBeUndefined();
  });

  it('should return undefined if extension has no valueCode', () => {
    const result = getCodeExtension(
      mockObservationExtensions,
      OBSERVATION_EXTENSION_URLS.PRIORITY_SCORE
    );

    expect(result).toBeUndefined();
  });
});

// =============================================================================
// getIntegerExtension Tests
// =============================================================================

describe('getIntegerExtension', () => {
  it('should return valueInteger for integer extension', () => {
    const result = getIntegerExtension(
      mockObservationExtensions,
      OBSERVATION_EXTENSION_URLS.PRIORITY_SCORE
    );

    expect(result).toBe(105);
  });

  it('should return days until runout', () => {
    const result = getIntegerExtension(
      mockObservationExtensions,
      OBSERVATION_EXTENSION_URLS.DAYS_UNTIL_RUNOUT
    );

    expect(result).toBe(5);
  });

  it('should return gap days remaining', () => {
    const result = getIntegerExtension(
      mockObservationExtensions,
      OBSERVATION_EXTENSION_URLS.GAP_DAYS_REMAINING
    );

    expect(result).toBe(12);
  });

  it('should return delay budget', () => {
    const result = getIntegerExtension(
      mockObservationExtensions,
      OBSERVATION_EXTENSION_URLS.DELAY_BUDGET
    );

    expect(result).toBe(4);
  });

  it('should return undefined if extension not found', () => {
    const result = getIntegerExtension(
      mockObservationExtensions,
      'https://example.com/nonexistent'
    );

    expect(result).toBeUndefined();
  });

  it('should return undefined if extension has no valueInteger', () => {
    const result = getIntegerExtension(
      mockObservationExtensions,
      OBSERVATION_EXTENSION_URLS.FRAGILITY_TIER
    );

    expect(result).toBeUndefined();
  });
});

// =============================================================================
// getBooleanExtension Tests
// =============================================================================

describe('getBooleanExtension', () => {
  it('should return true for is-current-pdc', () => {
    const result = getBooleanExtension(
      mockObservationExtensions,
      OBSERVATION_EXTENSION_URLS.IS_CURRENT_PDC
    );

    expect(result).toBe(true);
  });

  it('should return false for q4-adjusted', () => {
    const result = getBooleanExtension(
      mockObservationExtensions,
      OBSERVATION_EXTENSION_URLS.Q4_ADJUSTED
    );

    expect(result).toBe(false);
  });

  it('should return undefined if extension not found', () => {
    const result = getBooleanExtension(
      mockObservationExtensions,
      'https://example.com/nonexistent'
    );

    expect(result).toBeUndefined();
  });

  it('should return undefined if extension has no valueBoolean', () => {
    const result = getBooleanExtension(
      mockObservationExtensions,
      OBSERVATION_EXTENSION_URLS.FRAGILITY_TIER
    );

    expect(result).toBeUndefined();
  });
});

// =============================================================================
// getPeriodExtension Tests
// =============================================================================

describe('getPeriodExtension', () => {
  it('should return valuePeriod for treatment period', () => {
    const result = getPeriodExtension(
      mockObservationExtensions,
      OBSERVATION_EXTENSION_URLS.TREATMENT_PERIOD
    );

    expect(result).toEqual({
      start: '2025-01-15',
      end: '2025-12-31',
    });
  });

  it('should return undefined if extension not found', () => {
    const result = getPeriodExtension(mockObservationExtensions, 'https://example.com/nonexistent');

    expect(result).toBeUndefined();
  });

  it('should return undefined if extension has no valuePeriod', () => {
    const result = getPeriodExtension(
      mockObservationExtensions,
      OBSERVATION_EXTENSION_URLS.FRAGILITY_TIER
    );

    expect(result).toBeUndefined();
  });
});

// =============================================================================
// hasExtension Tests
// =============================================================================

describe('hasExtension', () => {
  it('should return true when extension exists', () => {
    const result = hasExtension(
      mockObservationExtensions,
      OBSERVATION_EXTENSION_URLS.FRAGILITY_TIER
    );

    expect(result).toBe(true);
  });

  it('should return false when extension does not exist', () => {
    const result = hasExtension(mockObservationExtensions, 'https://example.com/nonexistent');

    expect(result).toBe(false);
  });

  it('should return false for empty extensions array', () => {
    const result = hasExtension([], OBSERVATION_EXTENSION_URLS.FRAGILITY_TIER);

    expect(result).toBe(false);
  });

  it('should return false for undefined extensions', () => {
    const result = hasExtension(undefined, OBSERVATION_EXTENSION_URLS.FRAGILITY_TIER);

    expect(result).toBe(false);
  });
});

// =============================================================================
// setExtensionValue Tests
// =============================================================================

describe('setExtensionValue', () => {
  it('should add new extension to empty array', () => {
    const extensions: Extension[] = [];
    const result = setExtensionValue(extensions, OBSERVATION_EXTENSION_URLS.FRAGILITY_TIER, {
      valueCode: 'F1_IMMINENT',
    });

    expect(result).toHaveLength(1);
    expect(result[0].url).toBe(OBSERVATION_EXTENSION_URLS.FRAGILITY_TIER);
    expect(result[0].valueCode).toBe('F1_IMMINENT');
  });

  it('should update existing extension', () => {
    const extensions: Extension[] = [
      {
        url: OBSERVATION_EXTENSION_URLS.FRAGILITY_TIER,
        valueCode: 'F2_FRAGILE',
      },
    ];

    const result = setExtensionValue(extensions, OBSERVATION_EXTENSION_URLS.FRAGILITY_TIER, {
      valueCode: 'F1_IMMINENT',
    });

    expect(result).toHaveLength(1);
    expect(result[0].valueCode).toBe('F1_IMMINENT');
  });

  it('should add new extension while preserving existing', () => {
    const extensions: Extension[] = [
      {
        url: OBSERVATION_EXTENSION_URLS.FRAGILITY_TIER,
        valueCode: 'F2_FRAGILE',
      },
    ];

    const result = setExtensionValue(extensions, OBSERVATION_EXTENSION_URLS.PRIORITY_SCORE, {
      valueInteger: 80,
    });

    expect(result).toHaveLength(2);
    expect(result[0].valueCode).toBe('F2_FRAGILE');
    expect(result[1].valueInteger).toBe(80);
  });

  it('should handle undefined extensions array', () => {
    const result = setExtensionValue(undefined, OBSERVATION_EXTENSION_URLS.FRAGILITY_TIER, {
      valueCode: 'F3_MODERATE',
    });

    expect(result).toHaveLength(1);
    expect(result[0].valueCode).toBe('F3_MODERATE');
  });

  it('should set integer extension', () => {
    const result = setExtensionValue([], OBSERVATION_EXTENSION_URLS.PRIORITY_SCORE, {
      valueInteger: 155,
    });

    expect(result[0].valueInteger).toBe(155);
  });

  it('should set boolean extension', () => {
    const result = setExtensionValue([], OBSERVATION_EXTENSION_URLS.IS_CURRENT_PDC, {
      valueBoolean: true,
    });

    expect(result[0].valueBoolean).toBe(true);
  });

  it('should set period extension', () => {
    const result = setExtensionValue([], OBSERVATION_EXTENSION_URLS.TREATMENT_PERIOD, {
      valuePeriod: { start: '2025-01-01', end: '2025-12-31' },
    });

    expect(result[0].valuePeriod).toEqual({
      start: '2025-01-01',
      end: '2025-12-31',
    });
  });
});

// =============================================================================
// removeExtension Tests
// =============================================================================

describe('removeExtension', () => {
  it('should remove existing extension', () => {
    const extensions: Extension[] = [
      {
        url: OBSERVATION_EXTENSION_URLS.FRAGILITY_TIER,
        valueCode: 'F2_FRAGILE',
      },
      {
        url: OBSERVATION_EXTENSION_URLS.PRIORITY_SCORE,
        valueInteger: 80,
      },
    ];

    const result = removeExtension(extensions, OBSERVATION_EXTENSION_URLS.FRAGILITY_TIER);

    expect(result).toHaveLength(1);
    expect(result[0].url).toBe(OBSERVATION_EXTENSION_URLS.PRIORITY_SCORE);
  });

  it('should return same array if extension not found', () => {
    const extensions: Extension[] = [
      {
        url: OBSERVATION_EXTENSION_URLS.FRAGILITY_TIER,
        valueCode: 'F2_FRAGILE',
      },
    ];

    const result = removeExtension(extensions, 'https://example.com/nonexistent');

    expect(result).toHaveLength(1);
  });

  it('should return empty array if removing only extension', () => {
    const extensions: Extension[] = [
      {
        url: OBSERVATION_EXTENSION_URLS.FRAGILITY_TIER,
        valueCode: 'F2_FRAGILE',
      },
    ];

    const result = removeExtension(extensions, OBSERVATION_EXTENSION_URLS.FRAGILITY_TIER);

    expect(result).toHaveLength(0);
  });

  it('should return empty array for empty input', () => {
    const result = removeExtension([], OBSERVATION_EXTENSION_URLS.FRAGILITY_TIER);

    expect(result).toHaveLength(0);
  });

  it('should return empty array for undefined input', () => {
    const result = removeExtension(undefined, OBSERVATION_EXTENSION_URLS.FRAGILITY_TIER);

    expect(result).toHaveLength(0);
  });
});

// =============================================================================
// Patient Extension Tests
// =============================================================================

describe('Patient extension helpers', () => {
  const mockPatientExtensions: Extension[] = [
    {
      url: PATIENT_EXTENSION_URLS.CURRENT_FRAGILITY_TIER,
      valueCode: 'F1_IMMINENT',
    },
    {
      url: PATIENT_EXTENSION_URLS.CURRENT_PRIORITY_SCORE,
      valueInteger: 130,
    },
    {
      url: PATIENT_EXTENSION_URLS.DAYS_UNTIL_EARLIEST_RUNOUT,
      valueInteger: 3,
    },
  ];

  it('should get current fragility tier from patient', () => {
    const result = getCodeExtension(
      mockPatientExtensions,
      PATIENT_EXTENSION_URLS.CURRENT_FRAGILITY_TIER
    );

    expect(result).toBe('F1_IMMINENT');
  });

  it('should get current priority score from patient', () => {
    const result = getIntegerExtension(
      mockPatientExtensions,
      PATIENT_EXTENSION_URLS.CURRENT_PRIORITY_SCORE
    );

    expect(result).toBe(130);
  });

  it('should get days until earliest runout from patient', () => {
    const result = getIntegerExtension(
      mockPatientExtensions,
      PATIENT_EXTENSION_URLS.DAYS_UNTIL_EARLIEST_RUNOUT
    );

    expect(result).toBe(3);
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge cases', () => {
  it('should handle extensions with multiple value types (only first applicable)', () => {
    const ambiguousExtension: Extension[] = [
      {
        url: 'https://example.com/test',
        valueCode: 'TEST',
        valueInteger: 42,
      } as Extension,
    ];

    // Should get code when asking for code
    const codeResult = getCodeExtension(ambiguousExtension, 'https://example.com/test');
    expect(codeResult).toBe('TEST');

    // Should get integer when asking for integer
    const intResult = getIntegerExtension(ambiguousExtension, 'https://example.com/test');
    expect(intResult).toBe(42);
  });

  it('should handle negative integer values', () => {
    const extensions: Extension[] = [
      {
        url: OBSERVATION_EXTENSION_URLS.DAYS_UNTIL_RUNOUT,
        valueInteger: -5,
      },
    ];

    const result = getIntegerExtension(extensions, OBSERVATION_EXTENSION_URLS.DAYS_UNTIL_RUNOUT);

    expect(result).toBe(-5);
  });

  it('should handle zero integer values', () => {
    const extensions: Extension[] = [
      {
        url: OBSERVATION_EXTENSION_URLS.PRIORITY_SCORE,
        valueInteger: 0,
      },
    ];

    const result = getIntegerExtension(extensions, OBSERVATION_EXTENSION_URLS.PRIORITY_SCORE);

    expect(result).toBe(0);
  });

  it('should handle false boolean values explicitly', () => {
    const extensions: Extension[] = [
      {
        url: OBSERVATION_EXTENSION_URLS.Q4_ADJUSTED,
        valueBoolean: false,
      },
    ];

    const result = getBooleanExtension(extensions, OBSERVATION_EXTENSION_URLS.Q4_ADJUSTED);

    expect(result).toBe(false);
    expect(result).not.toBeUndefined();
  });
});

// =============================================================================
// getDecimalExtension Tests
// =============================================================================

describe('getDecimalExtension', () => {
  it('should return decimal value for PDC score', () => {
    const extensions: Extension[] = [
      {
        url: 'https://ignitehealth.io/fhir/StructureDefinition/pdc-value',
        valueDecimal: 0.72,
      },
    ];

    const result = getDecimalExtension(
      extensions,
      'https://ignitehealth.io/fhir/StructureDefinition/pdc-value'
    );

    expect(result).toBe(0.72);
  });

  it('should return undefined if extension not found', () => {
    const result = getDecimalExtension(
      mockObservationExtensions,
      'https://example.com/nonexistent'
    );

    expect(result).toBeUndefined();
  });

  it('should handle zero decimal value', () => {
    const extensions: Extension[] = [
      {
        url: 'https://example.com/test',
        valueDecimal: 0,
      },
    ];

    const result = getDecimalExtension(extensions, 'https://example.com/test');
    expect(result).toBe(0);
  });

  it('should handle decimal value close to 1', () => {
    const extensions: Extension[] = [
      {
        url: 'https://example.com/test',
        valueDecimal: 0.9999,
      },
    ];

    const result = getDecimalExtension(extensions, 'https://example.com/test');
    expect(result).toBe(0.9999);
  });
});
