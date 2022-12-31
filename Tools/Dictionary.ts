export class Dictionary<TValue> {
  private readonly _store: Map<string | number, TValue>;
  private readonly _keyStore: Map<string, number>;

  constructor() {
    this._store = new Map<string | number, TValue>();
    this._keyStore = new Map<string, number>();
  }

  public getValue(key: string | number): TValue | undefined {
    return this._store.get(key);
  }

  private getKeyIndex(key: string): number | undefined {
    return this._keyStore.get(key);
  }

  private getOrAddKeyIndex(key: string): number {
    let index = this.getKeyIndex(key);

    if (index === undefined) {
      index = this._keyStore.size;
      this._keyStore.set(key, index);
    }

    return index;
  }

  public add(key: string, value: TValue): number {
    const index = this.getOrAddKeyIndex(key);

    this._store.set(key, value);
    this._store.set(index, value);

    return index;
  }

  public remove(key: string): boolean {
    const index = this.getKeyIndex(key);

    if (index !== undefined) {
      this._store.delete(key);
      this._store.delete(index);

      return true;
    }
    return false;
  }

  public get size(): number {
    return this._store.size > 0 ? this._store.size / 2 : 0;
  }
}
