// Standard "nice numbers" tick algorithm (same idea as d3's ticks()): picks a
// round step (1/2/5 × a power of ten) and returns tick values from 0 up to the
// largest round multiple <= max. Doesn't extend the domain past max, so a caller
// scaling bars/positions against max stays untouched by adding ticks.
export function getNiceTicks(max: number, targetCount = 4): number[] {
  if (max <= 0) return [0];

  const roughStep = max / targetCount;
  const exponent = Math.floor(Math.log10(roughStep));
  const magnitude = 10 ** exponent;
  const fraction = roughStep / magnitude;

  let niceFraction: number;
  if (fraction < 1.5) niceFraction = 1;
  else if (fraction < 3) niceFraction = 2;
  else if (fraction < 7) niceFraction = 5;
  else niceFraction = 10;

  // Incident counts are always integers - never step by less than 1.
  const step = Math.max(1, niceFraction * magnitude);

  const ticks: number[] = [];
  for (let tick = 0; tick <= max; tick += step) ticks.push(tick);
  return ticks;
}
