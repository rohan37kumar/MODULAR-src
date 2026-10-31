/**
 * Uniform-grid broad phase. `query` returns every object whose position lies in the
 * axis-aligned box of half-size `r` around (x, y); callers add their own object
 * radius to `r` and do the exact circle test themselves.
 */
export class SpatialHash<T extends { x: number; y: number }> {
  private cells = new Map<number, T[]>();

  constructor(private readonly cell: number) {}

  // Packs two signed cell indices (|i| < 32768) into one number key.
  private key(ix: number, iy: number): number {
    return (ix + 32768) * 65536 + (iy + 32768);
  }

  clear(): void {
    this.cells.clear();
  }

  insert(o: T): void {
    const k = this.key(Math.floor(o.x / this.cell), Math.floor(o.y / this.cell));
    const bucket = this.cells.get(k);
    if (bucket) bucket.push(o);
    else this.cells.set(k, [o]);
  }

  query(x: number, y: number, r: number): T[] {
    const out: T[] = [];
    const x0 = Math.floor((x - r) / this.cell), x1 = Math.floor((x + r) / this.cell);
    const y0 = Math.floor((y - r) / this.cell), y1 = Math.floor((y + r) / this.cell);
    for (let ix = x0; ix <= x1; ix++) {
      for (let iy = y0; iy <= y1; iy++) {
        const bucket = this.cells.get(this.key(ix, iy));
        if (!bucket) continue;
        for (const o of bucket) if (Math.abs(o.x - x) <= r && Math.abs(o.y - y) <= r) out.push(o);
      }
    }
    return out;
  }
}
