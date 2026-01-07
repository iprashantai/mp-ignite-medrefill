/**
 * FHIR Extension Helper Functions
 *
 * Utilities for working with FHIR extensions in a type-safe manner.
 *
 * @see docs/implementation/phase-1-core-engine/specs/05_FHIR_EXTENSIONS_SPEC.md
 */

import type { Extension, Period } from '@medplum/fhirtypes';

// =============================================================================
// Core Extension Accessors
// =============================================================================

/**
 * Get an extension by its URL from an extensions array.
 *
 * @param extensions - Array of FHIR extensions (may be undefined)
 * @param url - The extension URL to find
 * @returns The matching extension or undefined
 *
 * @example
 * ```ts
 * const ext = getExtensionValue(observation.extension, EXTENSION_URLS.FRAGILITY_TIER);
 * if (ext?.valueCode) {
 *   // Use the value
 * }
 * ```
 */
export function getExtensionValue(
  extensions: Extension[] | undefined,
  url: string
): Extension | undefined {
  if (!extensions || extensions.length === 0) {
    return undefined;
  }
  return extensions.find((ext) => ext.url === url);
}

/**
 * Check if an extension exists in the extensions array.
 *
 * @param extensions - Array of FHIR extensions (may be undefined)
 * @param url - The extension URL to check
 * @returns True if the extension exists
 */
export function hasExtension(extensions: Extension[] | undefined, url: string): boolean {
  return getExtensionValue(extensions, url) !== undefined;
}

// =============================================================================
// Typed Value Getters
// =============================================================================

/**
 * Get a code (string) value from an extension.
 *
 * @param extensions - Array of FHIR extensions
 * @param url - The extension URL
 * @returns The valueCode or undefined
 */
export function getCodeExtension(
  extensions: Extension[] | undefined,
  url: string
): string | undefined {
  const ext = getExtensionValue(extensions, url);
  return ext?.valueCode;
}

/**
 * Get an integer value from an extension.
 *
 * @param extensions - Array of FHIR extensions
 * @param url - The extension URL
 * @returns The valueInteger or undefined
 */
export function getIntegerExtension(
  extensions: Extension[] | undefined,
  url: string
): number | undefined {
  const ext = getExtensionValue(extensions, url);
  return ext?.valueInteger;
}

/**
 * Get a boolean value from an extension.
 *
 * @param extensions - Array of FHIR extensions
 * @param url - The extension URL
 * @returns The valueBoolean or undefined
 */
export function getBooleanExtension(
  extensions: Extension[] | undefined,
  url: string
): boolean | undefined {
  const ext = getExtensionValue(extensions, url);
  return ext?.valueBoolean;
}

/**
 * Get a decimal (number) value from an extension.
 *
 * @param extensions - Array of FHIR extensions
 * @param url - The extension URL
 * @returns The valueDecimal or undefined
 */
export function getDecimalExtension(
  extensions: Extension[] | undefined,
  url: string
): number | undefined {
  const ext = getExtensionValue(extensions, url);
  return ext?.valueDecimal;
}

/**
 * Get a Period value from an extension.
 *
 * @param extensions - Array of FHIR extensions
 * @param url - The extension URL
 * @returns The valuePeriod or undefined
 */
export function getPeriodExtension(
  extensions: Extension[] | undefined,
  url: string
): Period | undefined {
  const ext = getExtensionValue(extensions, url);
  return ext?.valuePeriod;
}

/**
 * Get a string value from an extension.
 *
 * @param extensions - Array of FHIR extensions
 * @param url - The extension URL
 * @returns The valueString or undefined
 */
export function getStringExtension(
  extensions: Extension[] | undefined,
  url: string
): string | undefined {
  const ext = getExtensionValue(extensions, url);
  return ext?.valueString;
}

/**
 * Get a dateTime value from an extension.
 *
 * @param extensions - Array of FHIR extensions
 * @param url - The extension URL
 * @returns The valueDateTime or undefined
 */
export function getDateTimeExtension(
  extensions: Extension[] | undefined,
  url: string
): string | undefined {
  const ext = getExtensionValue(extensions, url);
  return ext?.valueDateTime;
}

// =============================================================================
// Extension Setters
// =============================================================================

/**
 * Extension value types that can be set.
 */
export interface ExtensionValue {
  valueCode?: string;
  valueInteger?: number;
  valueDecimal?: number;
  valueBoolean?: boolean;
  valueString?: string;
  valueDateTime?: string;
  valuePeriod?: Period;
  valueReference?: { reference: string };
}

/**
 * Set or update an extension value.
 * If the extension exists, it will be updated. Otherwise, a new extension is added.
 *
 * @param extensions - Array of FHIR extensions (may be undefined)
 * @param url - The extension URL
 * @param value - The value(s) to set
 * @returns A new array with the updated extension
 *
 * @example
 * ```ts
 * const newExtensions = setExtensionValue(
 *   observation.extension,
 *   EXTENSION_URLS.FRAGILITY_TIER,
 *   { valueCode: 'F1_IMMINENT' }
 * );
 * ```
 */
export function setExtensionValue(
  extensions: Extension[] | undefined,
  url: string,
  value: ExtensionValue
): Extension[] {
  const existingExtensions = extensions ?? [];

  // Filter out null/undefined/Infinity properties to prevent FHIR validation errors
  // FHIR constraint ext-1 requires extensions to have EITHER nested extensions OR a value[x], not both
  // Infinity becomes null in JSON serialization, causing validation errors
  const cleanValue = Object.fromEntries(
    Object.entries(value).filter(([_, v]) => {
      if (v === null || v === undefined) return false;
      if (typeof v === 'number' && !isFinite(v)) return false; // Exclude Infinity and NaN
      return true;
    })
  );

  if (Object.keys(cleanValue).length === 0) {
    // Remove extension if it exists but new value is entirely null/invalid
    return existingExtensions.filter((ext) => ext.url !== url);
  }

  const existingIndex = existingExtensions.findIndex((ext) => ext.url === url);

  const newExtension: Extension = {
    url,
    ...cleanValue,
  };

  if (existingIndex >= 0) {
    // Update existing extension
    const result = [...existingExtensions];
    result[existingIndex] = newExtension;
    return result;
  }

  // Add new extension
  return [...existingExtensions, newExtension];
}

/**
 * Remove an extension by URL.
 *
 * @param extensions - Array of FHIR extensions (may be undefined)
 * @param url - The extension URL to remove
 * @returns A new array without the specified extension
 */
export function removeExtension(extensions: Extension[] | undefined, url: string): Extension[] {
  if (!extensions || extensions.length === 0) {
    return [];
  }
  return extensions.filter((ext) => ext.url !== url);
}

// =============================================================================
// Batch Operations
// =============================================================================

/**
 * Set multiple extensions at once.
 *
 * @param extensions - Existing extensions array (may be undefined)
 * @param updates - Map of URL to value
 * @returns New extensions array with all updates applied
 */
export function setMultipleExtensions(
  extensions: Extension[] | undefined,
  updates: Record<string, ExtensionValue>
): Extension[] {
  let result = extensions ?? [];
  for (const [url, value] of Object.entries(updates)) {
    result = setExtensionValue(result, url, value);
  }
  return result;
}

/**
 * Extract all extension values into a plain object.
 * Useful for mapping FHIR extensions to internal types.
 *
 * @param extensions - Array of FHIR extensions
 * @param urlMap - Map of internal keys to extension URLs
 * @returns Object with extracted values
 */
export function extractExtensionValues<T extends Record<string, string>>(
  extensions: Extension[] | undefined,
  urlMap: T
): Record<keyof T, Extension | undefined> {
  const result = {} as Record<keyof T, Extension | undefined>;
  for (const [key, url] of Object.entries(urlMap)) {
    result[key as keyof T] = getExtensionValue(extensions, url);
  }
  return result;
}
