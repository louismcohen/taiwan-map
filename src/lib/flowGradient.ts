import type { ExpressionSpecification } from 'mapbox-gl';

export const FLOW_PERIOD = 15000;
const FLOW_PULSES = 3;
const FLOW_TAIL = 0.1;
const FLOW_ALPHA = 0.5;

// Comet-shaped highlights travelling from start (line-progress 0) to end (1); fade-in tail, crisp head.
// Heads run past 1 by the tail length so each pulse slides fully off the end before wrapping.
export function flowGradient(t: number): ExpressionSpecification {
  const stops: [number, number][] = [];
  for (let i = 0; i < FLOW_PULSES; i++) {
    const head = ((t + i / FLOW_PULSES) % 1) * (1 + FLOW_TAIL);
    const tail = head - FLOW_TAIL;
    const alphaAt = (p: number) => (FLOW_ALPHA * (p - tail)) / FLOW_TAIL;
    const start = Math.max(tail, 0);
    const end = Math.min(head, 1);
    if (start >= end) continue;
    stops.push([start, alphaAt(start)], [end, alphaAt(end)]);
    if (head + 0.002 < 1) stops.push([head + 0.002, 0]);
  }
  stops.sort((a, b) => a[0] - b[0]);
  if (!stops.length || stops[0][0] > 0) stops.unshift([0, 0]);
  if (stops[stops.length - 1][0] < 1) stops.push([1, 0]);

  const expr: (string | number | string[])[] = ['interpolate', ['linear'], ['line-progress']];
  let prev = -1;
  for (const [p, a] of stops) {
    if (p <= prev) continue;
    expr.push(p, `rgba(255,255,255,${a.toFixed(3)})`);
    prev = p;
  }
  return expr as ExpressionSpecification;
}
