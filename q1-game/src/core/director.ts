import { LOOSE_PART_IDS, PARTS } from '../data/parts';
import { TUNING, type BudgetKind } from '../data/tuning';
import { intRange, pick, range, type Rng } from './rng';
import type { Drop, EnemyKind, PartId, SpawnEvent } from './types';

const D = TUNING.director;
const P = TUNING.drops;
const BUDGET_KINDS = Object.keys(D.spawns) as BudgetKind[];

/** Units in one event of `kind` at elapsed `ms` that are priced per unit (Shielders; a mote pack is priced as one event). */
const groupSize = (kind: BudgetKind, ms: number) => (kind === 'shielder' && ms >= D.shielderGroup.fromMs ? D.shielderGroup.count : 1);

/** The most expensive event, so the bank cap can always afford it. */
const MAX_COST = Math.max(...BUDGET_KINDS.map(k => D.spawns[k].cost), D.spawns.shielder.cost * D.shielderGroup.count);

/** Minutes past the late-surge start, squared (0 before it). */
const surge = (ms: number) => Math.max(0, (ms - D.surgeStartMs) / 60_000) ** 2;

/** Budget rate (cost units per second) at elapsed `ms`: the linear ramp plus the late surge. */
export const budgetRate = (ms: number) => D.budgetBase + D.budgetRamp * (ms / D.budgetRampMs) + D.surgeBudget * surge(ms);
const rateAt = budgetRate;

/**
 * Decides what the swarm spawns and when (design §12). Pure: no positions, no Phaser.
 * Budget accrues continuously; the next kind is chosen in advance and bought once affordable,
 * so cheap kinds do not crowd out expensive ones.
 */
export class SpawnDirector {
  static maxEventsPerUpdate = D.maxEventsPerUpdate;
  elapsedMs = 0;
  private budget = 0;
  private nextCarrierMs = D.carrierIntervalMs;
  private pendingCarriers = 0;
  private nextKind: BudgetKind;

  constructor(private readonly rng: Rng) {
    this.nextKind = this.chooseKind();
  }

  /** Enemy HP multiplier for the current elapsed time. */
  hpMul(): number {
    return 1 + D.hpRamp * (this.elapsedMs / D.hpRampMs) + D.surgeHp * surge(this.elapsedMs);
  }

  /** Advances time and returns at most `maxEventsPerUpdate` events; leftovers wait for later calls. */
  update(dtMs: number): SpawnEvent[] {
    const dt = Number.isFinite(dtMs) && dtMs > 0 ? dtMs : 0;
    const t0 = this.elapsedMs;
    const t1 = t0 + dt;
    this.elapsedMs = t1;

    // Midpoint rate: exact while the rate is linear, and within a hair of exact on the surge's gentle curve at 50 ms steps.
    const bankCap = Math.max(rateAt(t1) * D.bankCapSec, MAX_COST);
    this.budget = Math.min(bankCap, this.budget + (dt / 1000) * rateAt((t0 + t1) / 2));

    while (this.elapsedMs >= this.nextCarrierMs) {
      this.pendingCarriers++;
      this.nextCarrierMs += D.carrierIntervalMs;
    }

    const cap = SpawnDirector.maxEventsPerUpdate;
    const out: SpawnEvent[] = [];
    while (this.pendingCarriers > 0 && out.length < cap) {
      out.push({ kind: 'carrier', count: 1 });
      this.pendingCarriers--;
    }
    while (out.length < cap) {
      const kind = this.nextKind;
      // The group size is fixed before the affordability check, so a Shielder pair costs 2 × cost.
      const group = groupSize(kind, this.elapsedMs);
      const cost = D.spawns[kind].cost * group;
      if (this.budget < cost) break;
      this.budget -= cost;
      out.push({ kind, count: kind === 'mote' ? intRange(this.rng, D.motePack.min, D.motePack.max) : group });
      this.nextKind = this.chooseKind();
    }
    return out;
  }

  private chooseKind(): BudgetKind {
    const open = BUDGET_KINDS.filter(k => this.elapsedMs >= D.spawns[k].unlockMs);
    return pick(this.rng, open, open.map(k => D.spawns[k].weight));
  }
}

/**
 * Decides what each kill drops (design §12): parts on a paced chance,
 * Forge Uplinks on a timer, and a Carrier's guaranteed haul.
 */
export class DropPacer {
  private lastPartMs = 0;
  /** No part has dropped yet this run: the first qualifying kill always drops one (first part at ~0:15). */
  private firstPart = true;
  private nextForgeMs: number;
  private readonly seedQueue: PartId[];
  private readonly history: PartId[] = [];

  constructor(private readonly rng: Rng, seeded: boolean) {
    this.seedQueue = seeded ? [...P.seededParts] : [];
    this.nextForgeMs = seeded ? P.seededForgeMs : this.forgeDelay();
  }

  onKill(kind: EnemyKind, nowMs: number): Drop[] {
    const out: Drop[] = [];

    if (kind === 'carrier') {
      const n = intRange(this.rng, P.carrierParts.min, P.carrierParts.max);
      for (let i = 0; i < n; i++) out.push({ type: 'part', part: this.nextPart() });
      this.lastPartMs = nowMs;
      this.firstPart = false;
      out.push({ type: 'forge' });
      this.nextForgeMs = nowMs + this.forgeDelay();
      if (this.rng() < P.carrierRepairChance) out.push({ type: 'repair' });
      return out;
    }

    if (P.partDroppers.includes(kind) && nowMs >= P.firstDropMs) {
      const since = nowMs - this.lastPartMs;
      const chance = P.partChance + (P.partChanceBonus[kind] ?? 0);
      if (this.firstPart || (since >= P.minGapMs && (since >= P.forcedGapMs || this.rng() < chance))) {
        out.push({ type: 'part', part: this.nextPart() });
        this.lastPartMs = nowMs;
        this.firstPart = false;
      }
    }

    if (nowMs >= this.nextForgeMs) {
      out.push({ type: 'forge' });
      this.nextForgeMs = nowMs + this.forgeDelay();
    }
    return out;
  }

  /** A Carrier entered a new phase: exactly one bonus part, and the normal part gap restarts from now. */
  onCarrierPhase(nowMs: number): Drop[] {
    this.lastPartMs = nowMs;
    this.firstPart = false;
    return [{ type: 'part', part: this.nextPart() }];
  }

  private forgeDelay(): number {
    return range(this.rng, P.forgeMinMs, P.forgeMaxMs);
  }

  /** Seeded parts first; then family-weighted, never the same part more than `maxSameInARow` times running. */
  private nextPart(): PartId {
    const seeded = this.seedQueue.shift();
    const part = seeded ?? this.randomPart();
    this.history.push(part);
    if (this.history.length > P.maxSameInARow) this.history.shift();
    return part;
  }

  private randomPart(): PartId {
    const h = this.history;
    const banned = h.length >= P.maxSameInARow && h.every(x => x === h[0]) ? h[0] : null;
    const candidates = LOOSE_PART_IDS.filter(id => id !== banned && PARTS[id].family !== 'core');
    // Family weight is split evenly across that family's candidates, so family odds hold.
    const famCount = new Map<string, number>();
    for (const id of candidates) famCount.set(PARTS[id].family, (famCount.get(PARTS[id].family) ?? 0) + 1);
    const weights = candidates.map(id => {
      const fam = PARTS[id].family as keyof typeof P.familyWeights;
      return (P.familyWeights[fam] ?? 0) / (famCount.get(fam) ?? 1);
    });
    return pick(this.rng, candidates, weights);
  }
}
