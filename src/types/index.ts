// Re-export FHIR types
export type {
  Patient,
  MedicationRequest,
  MedicationDispense,
  Task,
  Observation,
  Condition,
  AllergyIntolerance,
  AuditEvent,
  Bundle,
} from '@medplum/fhirtypes';

// Custom extension types
export type MedicationClass = 'MAD' | 'MAC' | 'MAH';
export type Priority = 'routine' | 'urgent' | 'asap' | 'stat';
export type TaskAction = 'approve' | 'deny' | 'escalate' | 'review';
export type ConfidenceCategory = 'high' | 'standard' | 'enhanced' | 'escalate';

// PDC types
export interface PDCScore {
  patientId: string;
  medicationClass: MedicationClass;
  score: number;
  daysInPeriod: number;
  daysCovered: number;
  isAdherent: boolean;
  calculatedAt: string;
}

// Queue types
export interface QueueItem {
  taskId: string;
  patientId: string;
  patientName: string;
  medicationClass: MedicationClass;
  medicationName: string;
  pdcScore: number;
  daysUntilGap: number;
  priority: Priority;
  aiRecommendation?: {
    recommendation: TaskAction;
    confidence: number;
    reasoning: string;
  };
  safetyAlerts: Array<{
    type: string;
    severity: 'high' | 'medium' | 'low';
    message: string;
  }>;
  createdAt: string;
}

// Result pattern
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };
