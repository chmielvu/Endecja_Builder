// Simple Linear Congruential Generator for reproducible random numbers
export class SeededRandom {
  private seed: number;

  constructor(seed: number = 12345) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  // Returns number between min (inclusive) and max (exclusive)
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

export const GLOBAL_SEED = 1893; // Founding year of Liga Narodowa