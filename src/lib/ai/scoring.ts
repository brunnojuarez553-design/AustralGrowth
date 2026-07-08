// Lead scoring engine — calculates closing probability 0-100
// Based on: stage, days since last contact, deal value, response pattern

import { DealStage, LeadStatus } from "@prisma/client";

interface ScoringInput {
  stage: DealStage;
  status: LeadStatus;
  daysSinceContact: number;
  estimatedValue: number;
  avgTicket: number;
  hasWhatsapp: boolean;
  hasEmail: boolean;
  hasInstagram: boolean;
  meetingScheduled: boolean;
  proposalViewed: boolean;
  industry: string | null;
  topIndustries: string[];
}

const STAGE_BASE_SCORE: Record<DealStage, number> = {
  LEAD: 5,
  CONTACTED: 15,
  RESPONDED: 30,
  MEETING: 50,
  DEMO: 60,
  PROPOSAL: 65,
  NEGOTIATION: 80,
  WON: 100,
  LOST: 0,
};

export function calculateLeadScore(input: ScoringInput): number {
  let score = STAGE_BASE_SCORE[input.stage];
  if (score === 0 || score === 100) return score;

  // Decay for no contact
  if (input.daysSinceContact > 7) score -= 10;
  if (input.daysSinceContact > 14) score -= 15;
  if (input.daysSinceContact > 30) score -= 20;

  // Multi-channel bonus
  const channels = [input.hasWhatsapp, input.hasEmail, input.hasInstagram].filter(Boolean).length;
  score += channels * 3;

  // Engagement signals
  if (input.meetingScheduled) score += 12;
  if (input.proposalViewed) score += 15;

  // Industry match (top performing)
  if (input.industry && input.topIndustries.includes(input.industry)) score += 8;

  // Value alignment
  if (input.estimatedValue > 0 && input.avgTicket > 0) {
    const ratio = input.estimatedValue / input.avgTicket;
    if (ratio >= 0.8 && ratio <= 1.5) score += 5; // Sweet spot
  }

  return Math.max(0, Math.min(99, Math.round(score)));
}

export function classifyLeadHeat(score: number): "cold" | "warm" | "hot" | "very_hot" {
  if (score >= 80) return "very_hot";
  if (score >= 60) return "hot";
  if (score >= 35) return "warm";
  return "cold";
}

export function detectStaleLeads(
  leads: Array<{ id: string; company: string; lastContact: Date | null; stage: DealStage }>
): Array<{ id: string; company: string; daysSinceContact: number }> {
  const now = new Date();
  return leads
    .filter((l) => l.stage !== "WON" && l.stage !== "LOST")
    .map((l) => ({
      id: l.id,
      company: l.company,
      daysSinceContact: l.lastContact
        ? Math.floor((now.getTime() - l.lastContact.getTime()) / 86400000)
        : 999,
    }))
    .filter((l) => l.daysSinceContact >= 5)
    .sort((a, b) => b.daysSinceContact - a.daysSinceContact);
}

export function projectRevenue(params: {
  currentRevenue: number;
  hotLeads: Array<{ value: number; probability: number }>;
  avgCloseRate: number;
  daysRemaining: number;
  totalDays: number;
}): { conservative: number; optimistic: number; projected: number } {
  const expectedFromHot = params.hotLeads.reduce(
    (sum, l) => sum + l.value * (l.probability / 100), 0
  );
  const runRate = (params.currentRevenue / (params.totalDays - params.daysRemaining)) * params.daysRemaining;
  return {
    conservative: Math.round(params.currentRevenue + runRate * 0.7),
    projected: Math.round(params.currentRevenue + expectedFromHot),
    optimistic: Math.round(params.currentRevenue + expectedFromHot * 1.3),
  };
}
