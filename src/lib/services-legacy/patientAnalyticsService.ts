/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, import/no-anonymous-default-export, max-lines-per-function, complexity */
/**
 * Patient Analytics Service - Materialized View Loader
 *
 * Loads pre-computed patient analytics from the patientAnalytics collection.
 * This eliminates browser computation for instant UI loading.
 *
 * @module patientAnalyticsService
 */

// Firebase stubs
const db: any = null;
const collection = (...args: any[]) => {
  console.warn('[FIREBASE STUB] collection called - not implemented in Medplum app');
  return {};
};
const getDocs = (...args: any[]) => {
  console.warn('[FIREBASE STUB] getDocs called - not implemented in Medplum app');
  return Promise.resolve({ docs: [], size: 0 });
};
const doc = (...args: any[]) => {
  console.warn('[FIREBASE STUB] doc called - not implemented in Medplum app');
  return {};
};
const getDoc = (...args: any[]) => {
  console.warn('[FIREBASE STUB] getDoc called - not implemented in Medplum app');
  return Promise.resolve({ exists: () => false, data: () => ({}), id: '' });
};
const query = (...args: any[]) => {
  console.warn('[FIREBASE STUB] query called - not implemented in Medplum app');
  return {};
};
const orderBy = (...args: any[]) => {
  console.warn('[FIREBASE STUB] orderBy called - not implemented in Medplum app');
  return {};
};
const limit = (...args: any[]) => {
  console.warn('[FIREBASE STUB] limit called - not implemented in Medplum app');
  return {};
};
const where = (...args: any[]) => {
  console.warn('[FIREBASE STUB] where called - not implemented in Medplum app');
  return {};
};

/**
 * Load pre-computed analytics for all patients
 *
 * @param {Object} options - Loading options
 * @param {number} options.limit - Max patients to load
 * @param {number} options.offset - Offset for pagination (Note: Firestore doesn't support offset well, use startAfter instead)
 * @param {string} options.orderByField - Field to order by (default: 'fragilityTier')
 * @param {string} options.orderDirection - 'asc' or 'desc' (default: 'asc')
 * @returns {Promise<{patients: Array, total: number, hasMore: boolean}>}
 */
export async function loadPatientAnalytics(options: any = {}): Promise<any> {
  const {
    limit: maxResults = 1000,
    offset = 0,
    orderByField = 'fragilityTier',
    orderDirection = 'asc',
  } = options;

  try {
    console.log(
      `📊 Loading pre-computed analytics (${orderByField} ${orderDirection}, limit: ${maxResults})...`
    );
    const startTime = performance.now();

    const analyticsRef = collection(db, 'patientAnalytics');
    let q;

    // Build query with ordering
    if (orderByField && orderDirection) {
      q = query(analyticsRef, orderBy(orderByField, orderDirection), limit(maxResults));
    } else {
      q = query(analyticsRef, limit(maxResults));
    }

    const snapshot = await getDocs(q);
    const patients = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(
      `✅ Loaded ${patients.length} patients with pre-computed analytics in ${duration}s`
    );

    return {
      patients,
      total: patients.length,
      hasMore: patients.length === maxResults,
    };
  } catch (error: any) {
    console.error('❌ Error loading patient analytics:', error);
    throw error;
  }
}

/**
 * Load pre-computed analytics for a single patient
 *
 * @param {string} patientId - Patient ID
 * @returns {Promise<Object|null>} Patient analytics or null if not found
 */
export async function loadPatientAnalyticsById(patientId: any): Promise<any> {
  try {
    const analyticsDoc = await getDoc(doc(db, 'patientAnalytics', patientId));

    if (!analyticsDoc.exists()) {
      console.warn(`⚠️  No pre-computed analytics found for patient ${patientId}`);
      return null;
    }

    return {
      id: analyticsDoc.id,
      ...analyticsDoc.data(),
    };
  } catch (error: any) {
    console.error(`❌ Error loading analytics for patient ${patientId}:`, error);
    throw error;
  }
}

/**
 * Load pre-computed analytics with filters
 *
 * @param {Object} filters - Filter options
 * @param {string} filters.fragilityTier - Filter by fragility tier
 * @param {boolean} filters.in14DayQueue - Filter by 14-day queue status
 * @param {boolean} filters.isAtRisk - Filter by at-risk status
 * @param {string} filters.measure - Filter by measure (MAC, MAD, MAH)
 * @param {number} filters.limit - Max results
 * @returns {Promise<{patients: Array, total: number}>}
 */
export async function loadPatientAnalyticsWithFilters(filters: any = {}): Promise<any> {
  const { fragilityTier, in14DayQueue, isAtRisk, measure, limit: maxResults = 1000 } = filters;

  try {
    console.log(`📊 Loading filtered analytics:`, filters);
    const startTime = performance.now();

    const analyticsRef = collection(db, 'patientAnalytics');
    const constraints: any = [];

    // Add filters
    if (fragilityTier) {
      constraints.push(where('fragilityTier', '==', fragilityTier));
    }
    if (typeof in14DayQueue === 'boolean') {
      constraints.push(where('in14DayQueue', '==', in14DayQueue));
    }
    if (typeof isAtRisk === 'boolean') {
      constraints.push(where('isAtRisk', '==', isAtRisk));
    }
    if (measure) {
      constraints.push(where('measures', 'array-contains', measure));
    }

    // Add ordering and limit
    constraints.push(orderBy('fragilityTier', 'asc'));
    constraints.push(limit(maxResults));

    const q = query(analyticsRef, ...constraints);
    const snapshot = await getDocs(q);

    const patients = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`✅ Loaded ${patients.length} filtered patients in ${duration}s`);

    return {
      patients,
      total: patients.length,
    };
  } catch (error: any) {
    console.error('❌ Error loading filtered analytics:', error);
    throw error;
  }
}

/**
 * Get population statistics from pre-computed analytics
 *
 * @returns {Promise<Object>} Population statistics
 */
export async function getPopulationStatistics(): Promise<any> {
  try {
    const analyticsRef = collection(db, 'patientAnalytics');
    const snapshot = await getDocs(analyticsRef);

    const stats: any = {
      total: snapshot.size,
      byTier: {},
      byMeasure: {},
      in14DayQueue: 0,
      isAtRisk: 0,
      avgPDC: 0,
      avgGapDaysRemaining: 0,
    };

    let totalPDC = 0;
    let totalGapDays = 0;

    snapshot.docs.forEach((doc: any) => {
      const data = doc.data();

      // Count by tier
      const tier = data.fragilityTier || 'UNKNOWN';
      stats.byTier[tier] = (stats.byTier[tier] || 0) + 1;

      // Count by measure
      (data.measures || []).forEach((measure: any) => {
        stats.byMeasure[measure] = (stats.byMeasure[measure] || 0) + 1;
      });

      // Count queue status
      if (data.in14DayQueue) stats.in14DayQueue++;
      if (data.isAtRisk) stats.isAtRisk++;

      // Sum for averages
      totalPDC += data.currentPDC || 0;
      totalGapDays += data.gapDaysRemaining || 0;
    });

    stats.avgPDC = snapshot.size > 0 ? totalPDC / snapshot.size : 0;
    stats.avgGapDaysRemaining = snapshot.size > 0 ? totalGapDays / snapshot.size : 0;

    return stats;
  } catch (error: any) {
    console.error('❌ Error getting population statistics:', error);
    throw error;
  }
}

export default {
  loadPatientAnalytics,
  loadPatientAnalyticsById,
  loadPatientAnalyticsWithFilters,
  getPopulationStatistics,
};
