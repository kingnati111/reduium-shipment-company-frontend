import { describe, expect, it } from 'vitest';
import { getJourneyProgress } from './journey.js';
import type { ShipmentStatus } from './statuses.js';

const history = (...statuses: ShipmentStatus[]) => statuses.map((status) => ({ status }));
const states = (p: ReturnType<typeof getJourneyProgress>) => p.steps.map((s) => s.state);

describe('journey progress', () => {
  it('delivered: every step complete', () => {
    const p = getJourneyProgress('DELIVERED', history('REGISTERED', 'IN_TRANSIT', 'DELIVERED'));
    expect(states(p)).toEqual(['complete', 'complete', 'complete', 'complete', 'complete']);
    expect(p.exception).toBeNull();
  });

  it('at customs: in transit is current, later steps upcoming', () => {
    const p = getJourneyProgress(
      'CUSTOMS_CLEARANCE',
      history('REGISTERED', 'RECEIVED', 'CUSTOMS_CLEARANCE'),
    );
    expect(p.currentPhase).toBe('transit');
    expect(states(p)).toEqual(['complete', 'complete', 'current', 'upcoming', 'upcoming']);
  });

  it('delayed: stays at the last phase actually reached, flagged as an exception', () => {
    const p = getJourneyProgress(
      'DELAYED',
      history('REGISTERED', 'RECEIVED', 'IN_TRANSIT', 'DELAYED'),
    );
    expect(p.currentPhase).toBe('transit');
    expect(p.exception).toBe('DELAYED');
    expect(states(p)).toEqual(['complete', 'complete', 'current', 'upcoming', 'upcoming']);
  });

  it('on hold right after registration: registered is current', () => {
    const p = getJourneyProgress('ON_HOLD', history('REGISTERED', 'ON_HOLD'));
    expect(p.currentPhase).toBe('registered');
    expect(p.exception).toBe('ON_HOLD');
  });

  it('delivery attempted: the delivery step is current', () => {
    const p = getJourneyProgress(
      'DELIVERY_ATTEMPTED',
      history('REGISTERED', 'IN_TRANSIT', 'DELIVERY_ATTEMPTED'),
    );
    expect(p.currentPhase).toBe('delivery');
    expect(p.exception).toBe('DELIVERY_ATTEMPTED');
  });

  it('copes with an empty history', () => {
    expect(getJourneyProgress('DELAYED', []).currentPhase).toBe('registered');
    expect(getJourneyProgress('IN_TRANSIT', []).currentPhase).toBe('transit');
  });
});
