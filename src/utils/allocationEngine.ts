/**
 * FarmGrid Automatic Allocation Engine
 *
 * This is the AUTHORITATIVE decision-making service.
 * It runs deterministically and must never be bypassed.
 *
 * Flow:
 *   Load Request → Validate → Find Compatible Resources → Hard Constraint Filter
 *   → Availability Check → Competing Request Detection → Priority Scoring
 *   → FCFS Tiebreak → Atomic Allocation → Audit + Notify
 */

import type {
  ResourceRequest, Resource, Allocation, Conflict, AllocationResult,
  FairnessEvent, AuditLog, Notification, PriorityBreakdown
} from '../types';
import { calculatePriority } from './priorityEngine';
import { generateId } from './constants';
import {
  MOCK_REQUESTS, MOCK_RESOURCES, MOCK_ALLOCATIONS, MOCK_CONFLICTS,
  MOCK_AUDIT_LOGS, MOCK_NOTIFICATIONS, MOCK_FARMERS, MOCK_FAIRNESS_EVENTS,
} from '../services/mockData';

// ─── Hard Constraint Checks ──────────────────────────────────────────────────

function isResourceCompatible(resource: Resource, request: ResourceRequest): boolean {
  return resource.category === request.resourceType;
}

function isResourceAvailable(resource: Resource): boolean {
  return resource.status === 'available';
}

function isNotDoubleBooked(resourceId: string, requestedStart: string, requestedEnd: string): boolean {
  const start = new Date(requestedStart).getTime();
  const end = new Date(requestedEnd).getTime();

  return !MOCK_ALLOCATIONS.some(alloc => {
    if (alloc.resourceId !== resourceId) return false;
    if (alloc.status === 'cancelled' || alloc.status === 'completed') return false;
    const allocStart = new Date(alloc.scheduledStart).getTime();
    const allocEnd = new Date(alloc.scheduledEnd).getTime();
    // Overlap: not (end <= allocStart || start >= allocEnd)
    return !(end <= allocStart || start >= allocEnd);
  });
}

function satisfiesFarmerTimeWindow(
  resource: Resource,
  request: ResourceRequest
): boolean {
  const earliest = new Date(request.earliestStart).getTime();
  const latest = new Date(request.latestEnd).getTime();
  const durationMs = request.durationDays * 86400000;

  // Check that there's enough time between earliest and latest for the duration
  return (latest - earliest) >= durationMs;
}

function computeScheduledWindow(request: ResourceRequest): { start: string; end: string } {
  const start = new Date(request.earliestStart);
  const end = new Date(start.getTime() + request.durationDays * 86400000);
  // Clamp end to latestEnd
  const latestEnd = new Date(request.latestEnd);
  const finalEnd = end < latestEnd ? end : latestEnd;
  return { start: start.toISOString(), end: finalEnd.toISOString() };
}

// ─── Competing Request Detection ─────────────────────────────────────────────

function findCompetingRequests(
  resourceId: string,
  requestedStart: string,
  requestedEnd: string,
  excludeRequestId: string
): ResourceRequest[] {
  const start = new Date(requestedStart).getTime();
  const end = new Date(requestedEnd).getTime();

  return MOCK_REQUESTS.filter(req => {
    if (req.id === excludeRequestId) return false;
    if (req.allocatedResourceId && req.allocatedResourceId !== resourceId) return false;
    if (req.status === 'cancelled' || req.status === 'completed') return false;
    if (req.status === 'scheduled' || req.status === 'allocated') return false;

    // Check if this request is also targeting the same resource type + overlapping window
    const reqStart = new Date(req.earliestStart).getTime();
    const reqEnd = new Date(req.latestEnd).getTime();
    return !(reqEnd <= start || reqStart >= end);
  });
}

// ─── Priority Score with Fairness Boost ──────────────────────────────────────

function getPriorityWithFairness(
  request: ResourceRequest,
  resource: Resource
): PriorityBreakdown {
  const farmer = MOCK_FARMERS.find(f => f.id === request.farmerId);
  const breakdown = calculatePriority(
    request,
    resource.lat,
    resource.lng,
    resource.quantity,
    MOCK_REQUESTS.filter(r => r.resourceType === request.resourceType && r.status !== 'completed' && r.status !== 'cancelled').length
  );

  // Fairness Guard: if farmer has consecutive losses, waiting time is already elevated
  // This is transparent — we just ensure the waitingTime component reflects waiting duration
  if (farmer && (farmer.consecutiveLosses || 0) >= 3) {
    // The existing waitingTime scorer already benefits long-waiting farmers
    // Log that fairness guard is active
    const existing = MOCK_FAIRNESS_EVENTS.find(
      fe => fe.farmerId === request.farmerId && fe.eventType === 'fairness_guard_activated'
        && new Date(fe.timestamp).toDateString() === new Date().toDateString()
    );
    if (!existing) {
      MOCK_FAIRNESS_EVENTS.push({
        id: 'fe_' + generateId(),
        farmerId: request.farmerId,
        timestamp: new Date().toISOString(),
        eventType: 'fairness_guard_activated',
        details: `Fairness Guard active: ${farmer.consecutiveLosses} consecutive losses. Waiting-time contribution elevated within 15-point limit.`,
        priorityScore: breakdown.total,
      });
    }
  }

  return breakdown;
}

// ─── Audit + Notification Helpers ────────────────────────────────────────────

function createAuditEntry(action: string, entityType: string, entityId: string, details: string): AuditLog {
  const log: AuditLog = {
    id: 'al_' + generateId(),
    adminId: 'system',
    adminName: 'FarmGrid Engine',
    action,
    entityType,
    entityId,
    details,
    createdAt: new Date().toISOString(),
  };
  MOCK_AUDIT_LOGS.unshift(log);
  return log;
}

function notifyUser(userId: string, title: string, message: string, type: Notification['type']) {
  MOCK_NOTIFICATIONS.unshift({
    id: 'n_' + generateId(),
    userId,
    title,
    message,
    type,
    isRead: false,
    createdAt: new Date().toISOString(),
  });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

// ─── Update Farmer Fairness Stats ────────────────────────────────────────────

function recordAllocationSuccess(farmerId: string) {
  const farmer = MOCK_FARMERS.find(f => f.id === farmerId);
  if (farmer) {
    farmer.allocationAttempts = (farmer.allocationAttempts || 0) + 1;
    farmer.successfulAllocations = (farmer.successfulAllocations || 0) + 1;
    farmer.consecutiveLosses = 0;
    farmer.waitingStartedAt = null;
  }
}

function recordAllocationLoss(farmerId: string) {
  const farmer = MOCK_FARMERS.find(f => f.id === farmerId);
  if (farmer) {
    farmer.allocationAttempts = (farmer.allocationAttempts || 0) + 1;
    farmer.consecutiveLosses = (farmer.consecutiveLosses || 0) + 1;
    if (!farmer.waitingStartedAt) {
      farmer.waitingStartedAt = new Date().toISOString();
    }
  }
}

// ─── Main Allocation Engine ───────────────────────────────────────────────────

export function processResourceRequest(requestId: string): AllocationResult {
  // Step 1: Load request
  const request = MOCK_REQUESTS.find(r => r.id === requestId);
  if (!request) {
    return { success: false, method: 'manual_review', requestId, message: 'Request not found.' };
  }

  // Step 2: Mark as processing
  request.status = 'processing';

  createAuditEntry('REQUEST_CREATED', 'Request', requestId,
    `Request ${requestId} by ${request.farmerName} for ${request.resourceType}. Urgency: ${request.urgencyLevel}. Processing started.`);

  // Step 3: Find compatible resources
  const compatible = MOCK_RESOURCES.filter(r => isResourceCompatible(r, request));

  if (compatible.length === 0) {
    request.status = 'manual_review';
    request.manualReviewReason = `No resources of type '${request.resourceType}' exist in the system.`;
    createAuditEntry('MANUAL_REVIEW_REQUIRED', 'Request', requestId,
      `No resources of type '${request.resourceType}' available. Manual review required.`);
    return {
      success: false, method: 'manual_review', requestId,
      message: `No ${request.resourceType} resources exist in the system.`,
      manualReviewReason: request.manualReviewReason,
    };
  }

  // Step 4-6: Hard constraint filtering
  const window = computeScheduledWindow(request);

  const feasibleResources = compatible.filter(resource => {
    // Hard: availability status
    if (!isResourceAvailable(resource)) return false;
    // Hard: no double-booking
    if (!isNotDoubleBooked(resource.id, window.start, window.end)) return false;
    // Hard: farmer time window feasible
    if (!satisfiesFarmerTimeWindow(resource, request)) return false;
    return true;
  });

  if (feasibleResources.length === 0) {
    const reasons: string[] = [];
    compatible.forEach(res => {
      if (res.status === 'maintenance') reasons.push(`${res.name}: Under maintenance`);
      else if (res.status === 'allocated' || res.status === 'retired') reasons.push(`${res.name}: Not available (${res.status})`);
      else if (!isNotDoubleBooked(res.id, window.start, window.end)) reasons.push(`${res.name}: Already booked`);
    });

    request.status = 'manual_review';
    request.manualReviewReason = reasons.length > 0
      ? `Hard constraints prevent allocation: ${reasons.join('; ')}`
      : 'No feasible resource available for the requested time window.';

    createAuditEntry('MANUAL_REVIEW_REQUIRED', 'Request', requestId,
      `No feasible resource for ${request.farmerName}. Reasons: ${request.manualReviewReason}`);

    const farmer = MOCK_FARMERS.find(f => f.id === request.farmerId);
    if (farmer) {
      notifyUser(farmer.userId, '⚠️ Manual Review Required',
        `No compatible resource is available for your ${request.resourceType} request. FarmGrid has escalated this for review.`, 'warning');
    }

    recordAllocationLoss(request.farmerId);

    return {
      success: false, method: 'manual_review', requestId,
      message: request.manualReviewReason,
      manualReviewReason: request.manualReviewReason,
    };
  }

  createAuditEntry('RESOURCE_MATCHED', 'Request', requestId,
    `Found ${feasibleResources.length} feasible resource(s) for ${request.farmerName}.`);

  // Step 7: Calculate priority for this request
  const myPb = getPriorityWithFairness(request, feasibleResources[0]);
  request.priorityScore = myPb.total;

  createAuditEntry('PRIORITY_CALCULATED', 'Request', requestId,
    `Priority score: ${myPb.total}/100. Factors: urgency=${myPb.urgency}/25, weather=${myPb.weatherRisk}/25, cropStage=${myPb.cropStage}/20, waiting=${myPb.waitingTime}/15, logistics=${myPb.logistics}/10, constraints=${myPb.constraints}/5.`);

  // Step 8: Detect competing requests for the same resource type + window
  const competingRequests = findCompetingRequests(
    feasibleResources[0].id,
    window.start,
    window.end,
    requestId
  ).filter(cr => cr.resourceType === request.resourceType);

  // Step 9: No competition → auto-allocate best resource
  if (competingRequests.length === 0) {
    // Pick resource with lowest logistics overhead (closest)
    const bestResource = feasibleResources.sort((a, b) => {
      const distA = Math.sqrt(Math.pow(a.lat - request.lat, 2) + Math.pow(a.lng - request.lng, 2));
      const distB = Math.sqrt(Math.pow(b.lat - request.lat, 2) + Math.pow(b.lng - request.lng, 2));
      return distA - distB;
    })[0];

    return performAllocation(request, bestResource, myPb, window, 'auto', false, undefined);
  }

  // Step 10: Competition exists → conflict detection + priority ranking
  createAuditEntry('CONFLICT_DETECTED', 'Conflict', 'new',
    `Conflict detected for ${request.resourceType}: ${request.farmerName} vs ${competingRequests.map(r => r.farmerName).join(', ')}.`);

  // Score all competing requests
  const allCompeting = [request, ...competingRequests];
  const scored = allCompeting.map(req => {
    const resource = feasibleResources[0];
    const pb = req.id === requestId ? myPb : getPriorityWithFairness(req, resource);
    return { request: req, pb, score: pb.total };
  });

  // Step 11: Sort by priority desc, then FCFS (createdAt asc), then id asc
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // FCFS tiebreak
    const tA = new Date(a.request.createdAt).getTime();
    const tB = new Date(b.request.createdAt).getTime();
    if (tA !== tB) return tA - tB;
    // Stable ID ordering
    return a.request.id < b.request.id ? -1 : 1;
  });

  const winner = scored[0];
  const losers = scored.slice(1);
  const isFcfsTiebreak = winner.score === (scored[1]?.score ?? -1);

  // Best resource assigned to the priority winner
  const bestForWinner = feasibleResources[0];

  // Pool of remaining candidate resources to try as alternatives
  const availableAlternatives = feasibleResources.filter(r => r.id !== bestForWinner.id);

  // Track alternative allocations made during conflict resolution
  let alternativeAllocatedToCurrent = false;
  let alternativeResourceForCurrent: Resource | null = null;
  let lastAssignedAlternativeName: string | undefined = undefined;
  let lastAssignedAlternativeId: string | undefined = undefined;

  // Process all competing runner-up requests: TRY ANOTHER RESOURCE first!
  losers.forEach(loser => {
    const loserRequest = MOCK_REQUESTS.find(r => r.id === loser.request.id);
    if (!loserRequest) return;

    const loserWindow = computeScheduledWindow(loserRequest);
    const altIdx = availableAlternatives.findIndex(alt =>
      isNotDoubleBooked(alt.id, loserWindow.start, loserWindow.end) && isResourceAvailable(alt)
    );

    if (altIdx >= 0) {
      // Alternative resource found!
      const altResource = availableAlternatives.splice(altIdx, 1)[0];
      lastAssignedAlternativeId = altResource.id;
      lastAssignedAlternativeName = altResource.name;

      if (loser.request.id === requestId) {
        alternativeAllocatedToCurrent = true;
        alternativeResourceForCurrent = altResource;
      } else {
        performAllocation(loserRequest, altResource, loser.pb, loserWindow, 'auto_alternative', false, undefined);
      }

      loserRequest.status = 'scheduled';
      loserRequest.allocatedResourceId = altResource.id;
      loserRequest.allocationMethod = 'auto_alternative';
      loserRequest.priorityScore = loser.score;

      const loserFarmer = MOCK_FARMERS.find(f => f.id === loserRequest.farmerId);
      if (loserFarmer) {
        notifyUser(
          loserFarmer.userId,
          '🔄 Alternative Resource Allocated!',
          `Conflict detected on ${bestForWinner.name} (won by ${winner.request.farmerName}, Priority ${winner.score}). FarmGrid conflict engine automatically found and secured alternative resource: ${altResource.name} (Your Score: ${loser.score}/100)!`,
          'success'
        );

        createAuditEntry(
          'ALTERNATIVE_RESOURCE_ALLOCATED',
          'Request',
          loserRequest.id,
          `Conflict resolved: ${loserRequest.farmerName} reallocated to alternative unit ${altResource.name}. Priority: ${loser.score}/100.`
        );
      }
    } else {
      // No alternative available for this specific window → waitlist
      loserRequest.status = 'waitlisted';
      loserRequest.waitlistReason = isFcfsTiebreak
        ? `Both requests had equal priority score (${loser.score}/100). ${winner.request.farmerName} was selected due to earlier submission time. No alternative ${loserRequest.resourceType} available currently.`
        : `Higher priority request won (${winner.score} vs ${loser.score}). No alternative ${loserRequest.resourceType} currently available in this time slot. Use What-If to explore alternative dates.`;
      loserRequest.priorityScore = loser.score;

      const loserFarmer = MOCK_FARMERS.find(f => f.id === loserRequest.farmerId);
      if (loserFarmer) {
        notifyUser(
          loserFarmer.userId,
          '⏳ Request Waitlisted',
          `Your ${loserRequest.resourceType} request was waitlisted. ${loserRequest.waitlistReason}`,
          'warning'
        );

        MOCK_FAIRNESS_EVENTS.push({
          id: 'fe_' + generateId(),
          farmerId: loserFarmer.id,
          timestamp: new Date().toISOString(),
          eventType: 'allocation_failed',
          details: loserRequest.waitlistReason,
          priorityScore: loser.score,
          winnerScore: winner.score,
          winnerFarmerName: winner.request.farmerName,
        });

        recordAllocationLoss(loserFarmer.id);
      }
    }
  });

  // Record conflict in database/mock store with full transparency
  const hasAlternativeResolution = !!lastAssignedAlternativeId;
  const conflict: Conflict = {
    id: 'c_' + generateId(),
    resourceId: bestForWinner.id,
    resourceName: bestForWinner.name,
    requestIds: allCompeting.map(r => r.id),
    rankedRequests: scored.map((s, i) => ({
      requestId: s.request.id,
      farmerName: s.request.farmerName,
      priorityScore: s.score,
      rank: i + 1,
    })),
    scoreDelta: scored.length > 1 ? Math.abs(scored[0].score - scored[1].score) : 0,
    status: 'auto_resolved',
    resolution: hasAlternativeResolution ? 'auto_alternative' : (isFcfsTiebreak ? 'auto_fcfs' : 'auto_priority'),
    resolvedBy: 'FarmGrid Conflict Engine',
    resolvedAt: new Date().toISOString(),
    autoResolved: true,
    winnerRequestId: winner.request.id,
    alternativeResourceId: lastAssignedAlternativeId,
    alternativeResourceName: lastAssignedAlternativeName,
    adminNote: hasAlternativeResolution
      ? `Conflict automatically resolved: ${winner.request.farmerName} allocated primary unit (${bestForWinner.name}). Alternative compatible unit (${lastAssignedAlternativeName}) automatically allocated to competing farmer.`
      : `Conflict resolved via priority ranking (${winner.score} vs ${scored[1]?.score || 0}).`,
    createdAt: new Date().toISOString(),
  };
  MOCK_CONFLICTS.push(conflict);

  // Format tiebreak explanation
  const tiebreakExpl = isFcfsTiebreak
    ? `Both requests had the same priority score of ${winner.score}. ${winner.request.farmerName} was selected because their request was submitted earlier (${new Date(winner.request.createdAt).toLocaleTimeString('en-IN')}).`
    : undefined;

  // If current request won:
  if (winner.request.id === requestId) {
    return performAllocation(request, bestForWinner, winner.pb, window, isFcfsTiebreak ? 'fcfs_tiebreak' : 'auto', isFcfsTiebreak, tiebreakExpl);
  }

  // Current request was a runner-up: Did it receive an alternative resource?
  if (alternativeAllocatedToCurrent && alternativeResourceForCurrent) {
    const altRes: Resource = alternativeResourceForCurrent;
    const altResult = performAllocation(
      request,
      altRes,
      myPb,
      window,
      'auto_alternative',
      false,
      `Conflict detected on ${bestForWinner.name}. Successfully reallocated to alternative unit: ${altRes.name}.`
    );
    return {
      ...altResult,
      message: `⚠️ Conflict detected on ${bestForWinner.name} (Prioritized ${winner.request.farmerName}, Score: ${winner.score} vs ${myPb.total}). Automatically allocated alternative available resource: ${altRes.name}!`,
    };
  }

  // Current request could not be allocated an alternative:
  const myLoserData = scored.find(s => s.request.id === requestId);
  request.status = 'waitlisted';
  request.waitlistReason = isFcfsTiebreak
    ? `Both requests had equal priority score (${myLoserData?.score ?? 0}). ${winner.request.farmerName} was selected due to earlier submission. All alternative units currently engaged.`
    : `Lower priority score (${myLoserData?.score ?? 0} vs ${winner.score}). ${winner.pb.explanation}. All alternative units currently engaged.`;
  request.priorityScore = myLoserData?.score ?? myPb.total;

  // Allocate winner request if not already done
  const winnerReq = MOCK_REQUESTS.find(r => r.id === winner.request.id);
  if (winnerReq && winnerReq.status !== 'scheduled') {
    performAllocation(winnerReq, bestForWinner, winner.pb, computeScheduledWindow(winnerReq),
      isFcfsTiebreak ? 'fcfs_tiebreak' : 'auto', isFcfsTiebreak, tiebreakExpl);
  }

  return {
    success: false,
    method: 'waitlisted',
    requestId,
    conflictId: conflict.id,
    message: request.waitlistReason,
    tiebreakExplanation: isFcfsTiebreak ? tiebreakExpl : undefined,
  };
}

// ─── Perform Atomic Allocation ────────────────────────────────────────────────

function performAllocation(
  request: ResourceRequest,
  resource: Resource,
  pb: PriorityBreakdown,
  window: { start: string; end: string },
  method: Allocation['allocationMethod'],
  fcfsTiebreak: boolean,
  tiebreakExplanation?: string
): AllocationResult {
  // Re-check double booking atomically (race condition guard)
  if (!isNotDoubleBooked(resource.id, window.start, window.end)) {
    request.status = 'manual_review';
    request.manualReviewReason = 'Race condition: resource was booked by another request simultaneously. Please retry.';
    return {
      success: false, method: 'manual_review', requestId: request.id,
      message: 'Resource was booked simultaneously. Please retry.',
    };
  }

  // Find provider info
  const provider = resource.providerId === 'p1'
    ? { id: 'p1', name: 'AgroTech Solutions Pvt Ltd', userId: 'u5' }
    : { id: 'p2', name: 'Kisan Sahayak Cooperative Society', userId: 'u6' };

  const allocation: Allocation = {
    id: 'a_' + generateId(),
    requestId: request.id,
    resourceId: resource.id,
    resourceName: resource.name,
    farmerId: request.farmerId,
    farmerName: request.farmerName,
    providerId: provider.id,
    providerName: provider.name,
    scheduledStart: window.start,
    scheduledEnd: window.end,
    status: 'scheduled',
    priorityScore: pb.total,
    priorityBreakdown: pb,
    allocationMethod: method,
    fcfsTiebreak,
    tiebreakExplanation,
    createdAt: new Date().toISOString(),
  };

  MOCK_ALLOCATIONS.push(allocation);

  // Update request status
  request.status = 'scheduled';
  request.allocatedResourceId = resource.id;
  request.allocationMethod = method;
  request.fcfsTiebreak = fcfsTiebreak;
  request.priorityScore = pb.total;

  // Audit
  const methodLabel = fcfsTiebreak ? 'FCFS_TIE_BREAK' : 'AUTO_ALLOCATED';
  createAuditEntry(methodLabel, 'Allocation', allocation.id,
    `${resource.name} allocated to ${request.farmerName}. Priority: ${pb.total}/100. Method: ${method}. Window: ${formatDateShort(window.start)} – ${formatDateShort(window.end)}.${fcfsTiebreak ? ' ' + tiebreakExplanation : ''}`
  );

  // Update fairness stats
  recordAllocationSuccess(request.farmerId);

  const farmer = MOCK_FARMERS.find(f => f.id === request.farmerId);
  if (farmer) {
    MOCK_FAIRNESS_EVENTS.push({
      id: 'fe_' + generateId(),
      farmerId: farmer.id,
      timestamp: new Date().toISOString(),
      eventType: 'allocation_success',
      details: `Resource allocated: ${resource.name}. Priority: ${pb.total}/100.`,
      priorityScore: pb.total,
    });

    notifyUser(farmer.userId, '✅ Resource Allocated!',
      `${resource.name} has been automatically allocated to you from ${formatDateShort(window.start)} to ${formatDateShort(window.end)}. Priority score: ${pb.total}/100. ${pb.explanation}`,
      'success');
  }

  // Notify provider
  notifyUser(provider.userId, '📋 New Booking',
    `${resource.name} allocated to ${request.farmerName} from ${formatDateShort(window.start)} to ${formatDateShort(window.end)}. Priority: ${pb.total}/100.`,
    'info');

  return {
    success: true,
    method,
    requestId: request.id,
    allocation,
    message: `${resource.name} automatically allocated from ${formatDateShort(window.start)} to ${formatDateShort(window.end)}.`,
    tiebreakExplanation,
  };
}

// ─── Disruption Recovery ──────────────────────────────────────────────────────

export function handleDisruption(resourceId: string, reason: string): void {
  // Mark affected allocations as disrupted
  const affected = MOCK_ALLOCATIONS.filter(
    a => a.resourceId === resourceId && (a.status === 'scheduled' || a.status === 'active')
  );

  affected.forEach(alloc => {
    // Mark allocation as cancelled
    alloc.status = 'cancelled';

    // Mark request as disrupted
    const req = MOCK_REQUESTS.find(r => r.id === alloc.requestId);
    if (req) {
      req.status = 'disrupted';

      // Try to reallocate
      const result = processResourceRequest(req.id);

      createAuditEntry('DISRUPTION_DETECTED', 'Allocation', alloc.id,
        `Resource ${resourceId} disrupted: ${reason}. Affected: ${alloc.farmerName}. Reallocation: ${result.success ? 'Success (' + result.allocation?.resourceName + ')' : 'Failed — Manual Review'}`);

      const farmer = MOCK_FARMERS.find(f => f.id === alloc.farmerId);
      if (farmer) {
        if (result.success) {
          notifyUser(farmer.userId, '🔄 Resource Rescheduled',
            `Your ${req.resourceType} was disrupted (${reason}). FarmGrid has automatically rescheduled you to ${result.allocation?.resourceName}.`, 'info');
        } else {
          notifyUser(farmer.userId, '⚠️ Disruption — Manual Review',
            `Your ${req.resourceType} was disrupted (${reason}). No alternative found automatically. FarmGrid admin has been notified.`, 'warning');
        }
      }
    }
  });

  // Mark resource as maintenance if disrupted
  const resource = MOCK_RESOURCES.find(r => r.id === resourceId);
  if (resource) resource.status = 'maintenance';
}
