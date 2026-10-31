import { expect, test } from 'vitest';
import type { Enemy } from '../../src/game/runtime';
import { Status } from '../../src/game/Status';

const enemy = () => ({ status: Status.fresh() }) as unknown as Enemy;

test('review #1: a snag stops movement for 300 ms, then the target cannot be re-snared for 1 s', () => {
  const e = enemy();
  expect(Status.snag(e)).toBe(true);
  expect(Status.speedMul(e)).toBe(0);
  Status.tick(e, 100);
  expect(Status.snag(e)).toBe(false); // a beam re-applying every 100 ms can't hold it
  Status.tick(e, 250);
  expect(Status.speedMul(e)).toBe(1);
  Status.tick(e, 700);
  expect(Status.snag(e)).toBe(true);
});

test('review #1: a snared enemy is not frozen (it keeps attacking)', () => {
  const e = enemy();
  Status.snag(e);
  expect(Status.is(e, 'frozen')).toBe(false);
});
