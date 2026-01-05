/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, import/no-anonymous-default-export, max-lines-per-function, complexity */

/**
 * Reusable random integer function
 */
export const randInt = (min: number, max: number): number => {
  const cryptoRand = new Uint32Array(1);
  crypto.getRandomValues(cryptoRand);
  const val = cryptoRand[0] / (0xffffffff + 1); // Normalize to [0, 1)
  return Math.floor(val * (max - min + 1)) + min;
};

export const asDate = (d: any): Date => (d instanceof Date ? d : new Date(d));

export const fmtDate = (d: any): string => {
  const dt = asDate(d);
  return `${dt.getMonth() + 1}-${dt.getDate()}-${String(dt.getFullYear()).slice(-2)}`;
};

export const fmtDateTime = (d: any): string => {
  const dt = asDate(d);
  return `${dt.getMonth() + 1}-${dt.getDate()}-${String(dt.getFullYear()).slice(-2)} ${dt
    .getHours()
    .toString()
    .padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`;
};

export const daysAgo = (n: number, referenceDate: any = null): Date => {
  const d = referenceDate ? new Date(referenceDate) : new Date();
  d.setDate(d.getDate() - n);
  return d;
};

export const daysAhead = (n: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

/**
 * Safely format a date, returning N/A if invalid
 * Handles string dates, Date objects, timestamps, and edge cases
 *
 * @param {string|Date|number} dateValue - Date to format
 * @param {string} format - Format string ('short', 'long', 'full', default: 'M-D-YY')
 * @returns {string} - Formatted date or 'N/A'
 */
export const formatDateSafely = (dateValue: any, format: string = 'short'): string => {
  if (!dateValue) return 'N/A';

  try {
    // Handle string dates and Invalid Date strings
    if (typeof dateValue === 'string') {
      if (dateValue === 'Invalid Date' || dateValue === '') return 'N/A';
      dateValue = new Date(dateValue);
    }

    // Handle timestamps (numbers)
    if (typeof dateValue === 'number') {
      dateValue = new Date(dateValue);
    }

    // Check if it's a valid Date object
    if (!(dateValue instanceof Date)) return 'N/A';
    if (isNaN(dateValue.getTime())) return 'N/A';

    // Format based on preference
    switch (format) {
      case 'short':
        return dateValue.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: '2-digit',
        });
      case 'long':
        return dateValue.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      case 'full':
        return dateValue.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      default:
        // Default format: M-D-YY
        return `${dateValue.getMonth() + 1}-${dateValue.getDate()}-${String(
          dateValue.getFullYear()
        ).slice(-2)}`;
    }
  } catch (err) {
    console.warn('Error formatting date:', dateValue, err);
    return 'N/A';
  }
};

/**
 * Calculate days to medication runout
 * Checks multiple possible fields and falls back to calculation from lastFillDate
 * This ensures consistent daysToRunout calculation across all components
 *
 * @param {Object} medication - Medication object
 * @returns {number|null} - Days until medication runs out, or null if cannot calculate
 */
export const calculateDaysToRunout = (medication: any): number | null => {
  if (!medication) return null;

  // Check multiple possible fields (priority order)
  if (typeof medication.daysSupplyRemaining === 'number') {
    return medication.daysSupplyRemaining;
  }
  if (typeof medication.daysUntilRunout === 'number') {
    return medication.daysUntilRunout;
  }
  if (typeof medication.daysToRunout === 'number') {
    return medication.daysToRunout;
  }
  if (medication.adherence?.daysUntilNextFill !== undefined) {
    return medication.adherence.daysUntilNextFill;
  }

  // Fallback: calculate from last fill date and days supply
  if (medication.lastFillDate && medication.daysSupply) {
    const lastFill = new Date(medication.lastFillDate);
    const today = new Date();
    const daysSinceLastFill = Math.floor(
      (today.getTime() - lastFill.getTime()) / (1000 * 60 * 60 * 24)
    );
    return medication.daysSupply - daysSinceLastFill;
  }

  return null;
};

/**
 * Parse patient name into standardized format
 * Handles multiple data structures and returns "Last, First" formatted name
 *
 * @param {Object} patient - Patient object
 * @returns {Object} - { firstName, lastName, displayName }
 */
export const parsePatientName = (
  patient: any
): { firstName: string; lastName: string; displayName: string } => {
  if (!patient) {
    return { firstName: '', lastName: '', displayName: 'Unknown' };
  }

  const { firstName, lastName, name } = patient;

  // Case 1: Separate firstName and lastName fields exist
  if (firstName && lastName) {
    return {
      firstName,
      lastName,
      displayName: `${lastName}, ${firstName}`,
    };
  }

  // Case 2: Name field exists (could be "Last, First" or "First Last" format)
  if (name) {
    // Check if already in "Last, First" format
    if (name.includes(',')) {
      const [last, first] = name.split(',').map((s: string) => s.trim());
      return {
        firstName: first,
        lastName: last,
        displayName: name,
      };
    }

    // Assume space-separated "First Last" format
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      // Single name - treat as last name
      return {
        firstName: '',
        lastName: parts[0],
        displayName: parts[0],
      };
    }

    // Multiple parts - first part is first name, rest is last name
    const parsedFirstName = parts[0];
    const parsedLastName = parts.slice(1).join(' ');
    return {
      firstName: parsedFirstName,
      lastName: parsedLastName,
      displayName: `${parsedLastName}, ${parsedFirstName}`,
    };
  }

  // Fallback: Unknown
  return { firstName: '', lastName: '', displayName: 'Unknown' };
};

/**
 * Generic sort function
 */
export const sortData = (data: any[], sortConfig: any): any[] => {
  if (!sortConfig.key) return data;

  const sorted = [...data].sort((a: any, b: any) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    // Handle nested date conversion for 'date' field in batches
    if (sortConfig.key === 'date' && aValue && typeof aValue.toDate === 'function') {
      aValue = aValue.toDate().getTime();
      bValue = bValue.toDate().getTime();
    } else if (sortConfig.key === 'runoutDate') {
      // For string dates like M-D-YY
      // Ensure dates are parsed correctly for comparison (e.g., "7-25-24" needs to be parsed as a full date)
      const parseDateString = (dateStr: any) => {
        if (!dateStr || dateStr === 'N/A') return new Date(0); // Return epoch or invalid date for N/A
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          // Assuming MM-DD-YY format, convert YY to full year
          const year = parseInt(parts[2], 10) + 2000; // Adjust for 2-digit year
          return new Date(year, parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
        }
        return new Date(dateStr); // Fallback for other date string formats
      };
      aValue = parseDateString(aValue);
      bValue = parseDateString(bValue);
      return sortConfig.direction === 'asc'
        ? aValue.getTime() - bValue.getTime()
        : bValue.getTime() - aValue.getTime();
    } else if (sortConfig.key === 'lastVisit') {
      // Handle last visit date sorting
      const parseLastVisit = (dateStr: any) => {
        if (!dateStr || dateStr === 'N/A') return new Date(0);
        return new Date(dateStr);
      };
      aValue = parseLastVisit(aValue);
      bValue = parseLastVisit(bValue);
      return sortConfig.direction === 'asc'
        ? aValue.getTime() - bValue.getTime()
        : bValue.getTime() - aValue.getTime();
    } else if (sortConfig.key === 'qaDecision') {
      // Custom sort for QA Status
      const order: any = {
        Disagree: 1,
        Agree: 2,
        Error: 3,
        'QA Not Run': 4,
        'N/A': 5,
        'Processing...': 6,
      };
      return order[aValue] - order[bValue];
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortConfig.direction === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
    }
    // Fallback for other types or mixed types
    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
  return sorted;
};
