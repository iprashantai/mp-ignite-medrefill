/**
 * Decision Badge Component
 *
 * Displays AI decision status (Approve/Deny/Pending):
 * - Approve: Green
 * - Deny: Red
 * - Pending: Yellow
 *
 * Also supports decision status variants:
 * - no-review-needed, pre-approved, override-approved: Green
 * - pre-denied, confirmed-denied: Red
 * - pending-review: Yellow
 * - reviewed: Blue
 *
 * Usage:
 * <DecisionBadge decision="approve" />
 * <DecisionBadge decision="pending-review" />
 */

import React from 'react';
import { Badge, type BadgeSize, type BadgeVariant } from './badge';
import { getDecisionVariant } from '@/lib/design-system/helpers';

export interface DecisionBadgeProps {
  decision: string;
  size?: BadgeSize;
  className?: string;
}

const DECISION_STATUS_LABELS: Record<string, string> = {
  'no-review-needed': 'Auto-Approved',
  'pending-review': 'Pending Review',
  'pre-approved': 'Pre-Approved',
  'pre-denied': 'Pre-Denied',
  reviewed: 'Reviewed',
  'override-approved': 'Override Approved',
  'confirmed-denied': 'Confirmed Denied',
};

export const DecisionBadge: React.FC<DecisionBadgeProps> = ({
  decision,
  size = 'sm',
  className,
}) => {
  const variant = getDecisionVariant(decision) as BadgeVariant;

  // Normalize label for simple decisions
  let label = decision;
  if (decision.toLowerCase() === 'approved') {
    label = 'Approve';
  } else if (decision.toLowerCase() === 'denied') {
    label = 'Deny';
  } else if (DECISION_STATUS_LABELS[decision]) {
    label = DECISION_STATUS_LABELS[decision];
  } else {
    // Capitalize first letter
    label = decision.charAt(0).toUpperCase() + decision.slice(1).toLowerCase();
  }

  return (
    <Badge variant={variant} size={size} className={className}>
      {label}
    </Badge>
  );
};

/**
 * Action Status Badge Component
 *
 * Displays action status with optional icons:
 * - rx-sent, filled-confirmed, rx-sent-not-filled
 * - exception-* (appt, pa, expired, clinical, patient-declined)
 * - ai-* (outreach-sent, barrier-detected)
 * - human-escalated, awaiting-patient-response, scheduled-followup
 */

export interface ActionStatusBadgeProps {
  status: string;
  showIcon?: boolean;
  size?: BadgeSize;
  className?: string;
}

const ACTION_STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant; icon: string }> =
  {
    'rx-sent': { label: 'Rx Sent', variant: 'rx-sent', icon: '📤' },
    'filled-confirmed': { label: 'Filled', variant: 'filled-confirmed', icon: '✅' },
    'rx-sent-not-filled': { label: 'Not Filled', variant: 'rx-sent-not-filled', icon: '⚠️' },
    'exception-appt': { label: 'Appt Needed', variant: 'exception-appt', icon: '🗓️' },
    'exception-pa': { label: 'Prior Auth', variant: 'exception-pa', icon: '📋' },
    'exception-expired': { label: 'Rx Expired', variant: 'exception-expired', icon: '⏰' },
    'exception-clinical': { label: 'Clinical Review', variant: 'exception-clinical', icon: '🔬' },
    'exception-patient-declined': {
      label: 'Patient Declined',
      variant: 'exception-patient-declined',
      icon: '🚫',
    },
    'ai-outreach-sent': { label: 'AI Outreach', variant: 'ai-outreach-sent', icon: '🤖' },
    'ai-barrier-detected': {
      label: 'Barrier Detected',
      variant: 'ai-barrier-detected',
      icon: '⚠️',
    },
    'human-escalated': { label: 'Human Escalated', variant: 'human-escalated', icon: '👤' },
    'awaiting-patient-response': {
      label: 'Awaiting Response',
      variant: 'awaiting-patient-response',
      icon: '⏸️',
    },
    'scheduled-followup': { label: 'Scheduled', variant: 'scheduled-followup', icon: '📅' },
  };

export const ActionStatusBadge: React.FC<ActionStatusBadgeProps> = ({
  status,
  showIcon = true,
  size = 'sm',
  className,
}) => {
  if (!status) return null;

  const config = ACTION_STATUS_CONFIG[status] || {
    label: status,
    variant: 'neutral' as BadgeVariant,
    icon: '❓',
  };

  return (
    <Badge variant={config.variant} size={size} className={className}>
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {config.label}
    </Badge>
  );
};

/**
 * Agent Badge Component
 *
 * Displays AI agent type (Primary/Manager):
 * - Primary: Blue
 * - Manager: Purple
 */

export interface AgentBadgeProps {
  agent: string;
  size?: BadgeSize;
  className?: string;
}

export const AgentBadge: React.FC<AgentBadgeProps> = ({ agent, size = 'sm', className }) => {
  if (!agent || agent === 'N/A') return null;

  const isManager = agent.toLowerCase() === 'manager';

  return (
    <Badge
      variant={isManager ? 'agent-manager' : 'agent-primary'}
      size={size}
      className={className}
    >
      {isManager ? 'Manager' : 'Primary'}
    </Badge>
  );
};

export default DecisionBadge;
