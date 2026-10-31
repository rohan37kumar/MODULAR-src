/** Fixed-capacity object pool: `acquire` returns null at the cap instead of allocating. */
export class Pool<T> {
  private free: T[] = [];
  private live = new Set<T>();
  private made = 0;

  constructor(private readonly cap: number, private readonly make: () => T) {}

  acquire(): T | null {
    let o = this.free.pop();
    if (o === undefined) {
      if (this.made >= this.cap) return null;
      o = this.make();
      this.made++;
    }
    this.live.add(o);
    return o;
  }

  release(o: T): void {
    if (!this.live.delete(o)) return;
    this.free.push(o);
  }

  get active(): number {
    return this.live.size;
  }

  get capacity(): number {
    return this.cap;
  }
}
