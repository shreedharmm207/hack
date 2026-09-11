import type { PriorityBreakdown, CropStage, UrgencyLevel } from '../types';

// Accept either old camelCase (ResourceRequest) or new snake_case (DB row) shape
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PriorityInput = any;

// ─── Priority Scoring Engine ────────────────────────────────────────────────
// Weights: urgency 25%, weatherRisk 25%, cropStage 20%, waitingTime 15%,
//          logistics 10%, constraints 5%

const WEIGHTS = {
  urgency: 25,
  weatherRisk: 25,
  cropStage: 20,
  waitingTime: 15,
  logistics: 10,
  constraints: 5,
};

function scoreUrgency(request: PriorityInput): number {
  const now = new Date();
  const latestEnd = new Date((request.latestEnd || request.latest_end || new Date().toISOString()) as string);
  const daysUntilDeadline = Math.max(0, (latestEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  // More urgent = closer deadline
  const urgencyMap: Record<UrgencyLevel, number> = {
    critical: 0.95,
    high: 0.80,
    medium: 0.55,
    low: 0.30,
  };
  
  const urgencyLevel = (request.urgencyLevel || request.urgency_level || 'medium') as UrgencyLevel;
  const levelScore = urgencyMap[urgencyLevel] * 15;
  const deadlineScore = daysUntilDeadline <= 3 ? 10 : daysUntilDeadline <= 7 ? 7 : daysUntilDeadline <= 14 ? 4 : 1;
  
  return Math.min(WEIGHTS.urgency, Math.round(levelScore + deadlineScore));
}

function scoreWeatherRisk(request: PriorityInput): number {
  // Simulate weather risk based on crop stage and urgency
  // In production, this would call a weather API
  const cropStageRisk: Record<CropStage, number> = {
    harvesting: 0.95,
    flowering: 0.85,
    vegetative: 0.60,
    seedling: 0.55,
    post_harvest: 0.25,
  };
  const cropStage = (request.cropStage || request.crop_stage || 'vegetative') as CropStage;
  const baseRisk = cropStageRisk[cropStage] ?? 0.5;
  // Add some pseudo-random variation based on request ID
  const variance = (parseInt(request.id.slice(-4), 16) % 20) / 100;
  return Math.min(WEIGHTS.weatherRisk, Math.round((baseRisk + variance) * WEIGHTS.weatherRisk));
}

function scoreCropStage(request: PriorityInput): number {
  const stageScores: Record<CropStage, number> = {
    harvesting: 20,
    flowering: 17,
    vegetative: 13,
    seedling: 10,
    post_harvest: 5,
  };
  const cs = (request.cropStage || request.crop_stage || 'vegetative') as CropStage;
  return stageScores[cs] ?? 10;
}

function scoreWaitingTime(createdAt: string): number {
  const now = new Date();
  const created = new Date(createdAt);
  const hoursWaited = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
  
  if (hoursWaited >= 72) return 15;
  if (hoursWaited >= 48) return 12;
  if (hoursWaited >= 24) return 9;
  if (hoursWaited >= 12) return 6;
  return 3;
}

function scoreLogistics(farmerLat: number, farmerLng: number, resourceLat: number, resourceLng: number): number {
  // Haversine distance approximation
  const R = 6371;
  const dLat = ((resourceLat - farmerLat) * Math.PI) / 180;
  const dLng = ((resourceLng - farmerLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((farmerLat * Math.PI) / 180) *
    Math.cos((resourceLat * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;
  
  // Closer = better logistics score
  if (distanceKm <= 5) return 10;
  if (distanceKm <= 15) return 8;
  if (distanceKm <= 30) return 6;
  if (distanceKm <= 50) return 4;
  return 2;
}

function scoreConstraints(resourceQuantity: number, pendingRequests: number): number {
  // More scarce resource = higher urgency to resolve
  const ratio = pendingRequests / Math.max(1, resourceQuantity);
  if (ratio >= 4) return 5;
  if (ratio >= 2) return 4;
  if (ratio >= 1) return 3;
  return 2;
}

export function calculatePriority(
  request: PriorityInput,
  resourceLat = 20.5937,
  resourceLng = 78.9629,
  resourceQuantity = 1,
  pendingRequests = 1
): PriorityBreakdown {
  const urgency = scoreUrgency(request);
  const weatherRisk = scoreWeatherRisk(request);
  const cropStageScore = scoreCropStage(request);
  const createdAt = (request.createdAt || request.created_at || new Date().toISOString()) as string;
  const waitingTime = scoreWaitingTime(createdAt);
  const lat = (request.lat || request.farm_lat || 20.5937) as number;
  const lng = (request.lng || request.farm_lng || 78.9629) as number;
  const logistics = scoreLogistics(lat, lng, resourceLat, resourceLng);
  const constraints = scoreConstraints(resourceQuantity, pendingRequests);
  
  const total = urgency + weatherRisk + cropStageScore + waitingTime + logistics + constraints;
  
  const explanationParts: string[] = [];
  if (urgency >= 20) explanationParts.push('critical deadline proximity');
  if (weatherRisk >= 20) explanationParts.push('high weather exposure risk');
  if (cropStageScore >= 17) explanationParts.push('crop at peak sensitive stage');
  if (waitingTime >= 12) explanationParts.push('extended queue waiting time');
  if (logistics >= 8) explanationParts.push('minimal logistics overhead');
  
  const explanation =
    explanationParts.length > 0
      ? `This farmer received priority due to: ${explanationParts.join(', ')}.`
      : 'Standard priority allocation based on scoring criteria.';
  
  return {
    urgency,
    weatherRisk,
    cropStage: cropStageScore,
    waitingTime,
    logistics,
    constraints,
    total,
    explanation,
  };
}

export function getPriorityLabel(score: number): { label: string; color: string } {
  if (score >= 85) return { label: 'Critical', color: 'text-red-600 bg-red-50' };
  if (score >= 70) return { label: 'High', color: 'text-amber-600 bg-amber-50' };
  if (score >= 50) return { label: 'Medium', color: 'text-blue-600 bg-blue-50' };
  return { label: 'Low', color: 'text-slate-600 bg-slate-100' };
}
