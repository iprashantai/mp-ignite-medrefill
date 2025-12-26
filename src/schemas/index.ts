import { z } from 'zod';

/**
 * PDC Calculation Schemas
 */
export const MedicationClassSchema = z.enum(['MAD', 'MAC', 'MAH']);

export const PDCInputSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  medicationClass: MedicationClassSchema,
  dispenses: z.array(
    z.object({
      id: z.string(),
      whenHandedOver: z.string().datetime(),
      daysSupply: z.number().positive(),
      rxNormCode: z.string(),
    })
  ),
  measurementPeriodStart: z.string().datetime(),
  measurementPeriodEnd: z.string().datetime(),
  hospitalizations: z
    .array(
      z.object({
        start: z.string().datetime(),
        end: z.string().datetime(),
      })
    )
    .optional(),
});

export const PDCOutputSchema = z.object({
  pdcScore: z.number().min(0).max(1),
  pdcPercentage: z.number().min(0).max(100),
  isAdherent: z.boolean(),
  daysInPeriod: z.number(),
  daysCovered: z.number(),
  daysExcluded: z.number(),
  gaps: z.array(
    z.object({
      start: z.string(),
      end: z.string(),
      daysLength: z.number(),
    })
  ),
  fillDetails: z.array(
    z.object({
      originalDate: z.string(),
      adjustedDate: z.string(),
      daysSupply: z.number(),
      wasShifted: z.boolean(),
    })
  ),
  calculatedAt: z.string().datetime(),
  version: z.string(),
});

export type PDCInput = z.infer<typeof PDCInputSchema>;
export type PDCOutput = z.infer<typeof PDCOutputSchema>;

/**
 * Task Schemas
 */
export const TaskPrioritySchema = z.enum(['routine', 'urgent', 'asap', 'stat']);
export const TaskStatusSchema = z.enum([
  'draft',
  'requested',
  'received',
  'accepted',
  'rejected',
  'ready',
  'cancelled',
  'in-progress',
  'on-hold',
  'failed',
  'completed',
  'entered-in-error',
]);

export const CreateTaskSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  medicationRequestId: z.string().min(1, 'Medication Request ID is required'),
  priority: TaskPrioritySchema,
  description: z.string().min(1, 'Description is required'),
  dueDate: z.string().datetime().optional(),
});

export const UpdateTaskSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  note: z.string().optional(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

/**
 * AI Recommendation Schemas
 */
export const TaskActionSchema = z.enum(['approve', 'deny', 'escalate', 'review']);
export const ConfidenceCategorySchema = z.enum(['high', 'standard', 'enhanced', 'escalate']);

export const AIRecommendationSchema = z.object({
  recommendation: TaskActionSchema,
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  citations: z.array(z.string()).optional(),
  safetyFlags: z
    .array(
      z.object({
        type: z.string(),
        severity: z.enum(['high', 'medium', 'low']),
        message: z.string(),
      })
    )
    .optional(),
});

export type AIRecommendation = z.infer<typeof AIRecommendationSchema>;

/**
 * Confidence Scoring Schema
 */
export const ConfidenceFactorsSchema = z.object({
  checkerAgreement: z.number().min(0).max(1),
  selfConsistency: z.number().min(0).max(1),
  sourceQuality: z.number().min(0).max(1),
  contextCompleteness: z.number().min(0).max(1),
  modelConfidence: z.number().min(0).max(1),
});

export type ConfidenceFactors = z.infer<typeof ConfidenceFactorsSchema>;

/**
 * FHIR Extension URLs (centralized)
 */
export const EXTENSION_URLS = {
  pdcScore: 'https://ignitehealth.com/fhir/extensions/pdc-score',
  riskLevel: 'https://ignitehealth.com/fhir/extensions/risk-level',
  aiRecommendation: 'https://ignitehealth.com/fhir/extensions/ai-recommendation',
  aiConfidence: 'https://ignitehealth.com/fhir/extensions/ai-confidence',
  daysUntilGap: 'https://ignitehealth.com/fhir/extensions/days-until-gap',
} as const;

/**
 * Task Code System
 */
export const TASK_CODES = {
  system: 'https://ignitehealth.com/task-types',
  refillReview: 'refill-review',
  pharmacistEscalation: 'pharmacist-escalation',
  patientOutreach: 'patient-outreach',
} as const;

/**
 * Observation Categories
 */
export const OBSERVATION_CATEGORIES = {
  system: 'https://ignitehealth.com/observation-category',
  adherenceMetric: 'adherence-metric',
  riskAssessment: 'risk-assessment',
} as const;
