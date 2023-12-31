/* eslint-disable max-len */
/* eslint-disable arrow-body-style */
/* eslint-disable prefer-destructuring */
/* eslint-disable no-underscore-dangle */
export interface Comparable<T> {
  compare(object: T): number;
}

export const isIterable = <K, V>(value: unknown): value is Iterable<readonly [K, V]> => {
  if (value == null) {
    return false;
  }
  const itr = value as Iterable<readonly [K, V]>;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (itr[Symbol.iterator] == null) {
    return false;
  }
  return true;
};

export const isComparable = (object: unknown): object is Comparable<unknown> => {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const toString = Object.prototype.toString;
  // eslint-disable-next-line @typescript-eslint/ban-types
  const cast = object as Record<string, Function | undefined>;
  return cast.compare != null && toString.call(cast.compare).endsWith('Function]');
};

export const isDate = (value: unknown): value is Date => {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const toString = Object.prototype.toString;
  return toString.call(value).endsWith('Date]');
};

/* eslint-disable no-dupe-class-members */
const numberComparator = (a: number, b: number): number => a - b;
const bigIntComparator = (a: bigint, b: bigint): number => Number(a - b);
const stringComparator = (a: string, b: string): number => a.localeCompare(b);
const dateComparator = (a: Date, b: Date): number => a.getTime() - b.getTime();

const comparators = {
  number: numberComparator,
  string: stringComparator,
  Date: dateComparator,
  bigInt: bigIntComparator,
  none: () => 0,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const decideCompareFn = (value: unknown): ((a: any, b: any) => number) => {
  if (typeof value === 'number') {
    return comparators.number;
  }
  if (typeof value === 'string') {
    return comparators.string;
  }
  if (typeof value === 'bigint') {
    return comparators.bigInt;
  }
  if (isDate(value)) {
    return comparators.Date;
  }
  if (isComparable(value)) {
    return (o1: Comparable<unknown>, o2: Comparable<unknown>): number => {
      return o1.compare(o2);
    };
  }
  throw new Error(
    'Cannot sort keys in this map. You have to specify compareFn if the type of key in this map is not number, string, or Date.',
  );
};

export default class TreeMap<K, V> extends Map {
  /**
   * A function that defines the sort order of the keys.
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#Description
   */
  private compareFn: (a: K, b: K) => number;

  private sortedKeys: K[];

  private specifiedCompareFn = false;

  // private reverseOrder: boolean = false

  get comparator(): (a: K, b: K) => number {
    return this.compareFn;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types, class-methods-use-this
  private isCompareFn = (value: any): value is (a: K, b: K) => number => {
    return typeof value === 'function';
  };

  private compare(a: K, b: K): number {
    const val = Math.sign(this.compareFn(a, b));
    // return this.reverseOrder ? -val : val
    return val;
  }

  /**
   * @param compareFn A function that defines the sort order of the keys.
   */
  constructor(compareFn?: (a: K, b: K) => number);
  /**
   * @param entries entries
   * @param compareFn A function that defines the sort order of the keys.
   */
  constructor(entries?: readonly (readonly [K, V])[] | null, compareFn?: (a: K, b: K) => number);
  /**
   * @param iterable Iterable object
   * @param compareFn A function that defines the sort order of the keys.
   */
  constructor(iterable?: IterableIterator<[K, V]>, compareFn?: (a: K, b: K) => number);
  /**
   * @param map `Map` object
   * @param compareFn A function that defines the sort order of the keys.
   */
  constructor(map?: Map<K, V>, compareFn?: (a: K, b: K) => number);
  constructor(
    iterableOrCompareFn?:
      | readonly (readonly [K, V])[]
      | IterableIterator<[K, V]>
      | Map<K, V>
      | ((a: K, b: K) => number)
      | null,
    compareFn?: (a: K, b: K) => number,
  ) {
    super();
    this.compareFn = comparators.none;
    this.sortedKeys = [];
    if (isIterable<K, V>(iterableOrCompareFn)) {
      this._constructor(iterableOrCompareFn, compareFn);
    }
    if (this.isCompareFn(iterableOrCompareFn)) {
      this._constructor(null, iterableOrCompareFn);
    }
    if (iterableOrCompareFn == null) {
      this._constructor(null, compareFn);
    }
    // if (reverse) {
    //   this.reverseOrder = reverse
    // }
  }

  private _constructor(
    iterable: Iterable<readonly [K, V]> | null,
    compareFn?: (a: K, b: K) => number,
  ): void {
    this.compareFn = compareFn == null ? comparators.none : compareFn;
    this.specifiedCompareFn = compareFn != null;
    if (iterable == null) {
      return;
    }
    for (const entry of iterable) {
      this.set(...entry);
    }
  }

  /**
   * Creates and returns a new `TreeMap` object from the given map.
   * @param map Map object
   * @param compareFn Specifies a function that defines the sort order of the keys
   */
  public static fromMap<K, V>(map: Map<K, V>, compareFn?: (a: K, b: K) => number): TreeMap<K, V> {
    const treeMap = new TreeMap<K, V>(compareFn);
    treeMap.setAll(map);
    return treeMap;
  }

  /**
   * Duplicates this map and returns it as a new `TreeMap` object.
   */
  public duplicate(): TreeMap<K, V> {
    return TreeMap.fromMap<K, V>(this, this.compareFn);
  }

  /**
   * Returns this map as a new `Map` object.
   */
  public toMap(): Map<K, V> {
    const normalMap: Map<K, V> = new Map();
    const entries = Array.from(super.entries());
    entries.sort((a: [K, V], b: [K, V]) => {
      return this.compareFn(a[0], b[0]);
    });
    entries.forEach(([k, v]) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      normalMap.set(k, v);
    });
    return normalMap;
  }

  public reverseKeys(): IterableIterator<K> {
    const keys = [...this.sortedKeys].reverse();
    return keys.values();
  }

  public override get(key: K): V | undefined {
    const resultKey = this.sortedKeys.find((key0) => this.comparator(key0, key) === 0);
    if (resultKey == null) {
      return undefined;
    }
    return super.get(resultKey) as V | undefined;
  }

  /**
   * Adds or updates entry with the specified value with the specified key in this map.
   * @param key
   * @param value
   */
  public override set(key: K, value: V): this {
    if (this.sortedKeys.length === 0 && !this.specifiedCompareFn) {
      this.compareFn = decideCompareFn(key);
      this.specifiedCompareFn = true;
    }

    const actualKey = this.sortedKeys.find((k) => this.compareFn(k, key) === 0);
    if (actualKey == null) {
      this.sortedKeys.push(key);
      super.set(key, value);
    } else {
      super.set(actualKey, value);
    }

    this.sortedKeys.sort(this.compareFn);

    return this;
  }

  /**
   * Copies all of the entries from the given map to this map.
   * @param map
   */
  public setAll(map: Map<K, V>): this {
    map.forEach((value, key) => {
      this.set(key, value);
    });
    return this;
  }

  /**
   * Removes the entry for given key from this map and returns `true` if present.
   * @param key
   */
  public override delete(key: K): boolean {
    if (super.delete(key)) {
      this.sortedKeys = this.sortedKeys.filter((existKey) => this.compare(existKey, key) !== 0);
      return true;
    }
    return false;
  }

  /**
   * Removes all of the entry from this map.
   */
  public override clear(): void {
    super.clear();
    this.sortedKeys = [];
  }

  /**
   * Returns an iterable of sorted keys in this map.
   */
  public override keys(): IterableIterator<K> {
    return this.sortedKeys.values();
  }

  /**
   * Returns an iterable of sorted values in this map.
   */
  public override values(): IterableIterator<V> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.sortedKeys.map((k) => super.get(k)).values();
  }

  /**
   * Returns an iterable of sorted entries in this map.
   */
  public override entries(): IterableIterator<[K, V]> {
    return this.toMap().entries();
  }

  /**
   * Returns the first entry currently in this map, or `undefined` if the map is empty.
   */
  public firstEntry(): [K, V] | undefined {
    const key = this.firstKey();
    if (key == null) {
      return undefined;
    }
    const value = this.get(key);
    return value === undefined ? undefined : [key, value];
  }

  /**
   * Returns the first key currently in this map, or `undefined` if the map is empty.
   */
  public firstKey(): K | undefined {
    return this.sortedKeys[0];
  }

  /**
   * Returns the last entry currently in this map, or `undefined` if the map is empty.
   */
  public lastEntry(): [K, V] | undefined {
    const key = this.lastKey();
    if (key == null) {
      return undefined;
    }
    const value = this.get(key);
    return value === undefined ? undefined : [key, value];
  }

  /**
   * Returns the last key currently in this map, or `undefined` if the map is empty.
   */
  public lastKey(): K | undefined {
    return [...this.sortedKeys].reverse()[0];
  }

  /**
   * Removes the first element of this map and returns that removed entry,
   * or `undefined` if the map is empty.
   */
  public shiftEntry(): [K, V] | undefined {
    const entry = this.firstEntry();
    if (entry == null) {
      return undefined;
    }
    this.delete(entry[0]);
    return entry;
  }

  /**
   * Removes the last element of this map and returns that removed entry,
   * or `undefined` if the map is empty.
   */
  public popEntry(): [K, V] | undefined {
    const entry = this.lastEntry();
    if (entry == null) {
      return undefined;
    }
    this.delete(entry[0]);
    return entry;
  }

  /**
   * Returns entry associated with the greatest key from the keys less than or equal to the specified key,
   * or `undefined` if there is no such key.
   * @param key
   */
  public floorEntry(key: K): [K, V] | undefined {
    const resultKey = this.floorKey(key);
    if (resultKey != null) {
      const value = this.get(resultKey);
      return value === undefined ? undefined : [resultKey, value];
    }
    return undefined;
  }

  /**
   * Returns the greatest key from the keys less than or equal to the specified key,
   * or `undefined` if there is no such key.
   * @param key
   */
  public floorKey(key: K): K | undefined {
    const filtered = this.sortedKeys.filter((existKey) => this.compare(existKey, key) <= 0);
    return filtered.reverse()[0];
  }

  /**
   * Returns entry associated with the least key from the keys greater than or equal to the specified key,
   * or `undefined` if there is no such key.
   * @param key
   */
  public ceilingEntry(key: K): [K, V] | undefined {
    const resultKey = this.ceilingKey(key);
    if (resultKey != null) {
      const value = this.get(resultKey);
      return value === undefined ? undefined : [resultKey, value];
    }
    return undefined;
  }

  /**
   * Returns the least key from the keys greater than or equal to the specified key,
   * or `undefined` if there is no such key.
   * @param key
   */
  public ceilingKey(key: K): K | undefined {
    const filtered = this.sortedKeys.filter((existKey) => this.compare(existKey, key) >= 0);
    return filtered[0];
  }

  /**
   * Returns entry associated with the greatest key from the keys less than the specified key,
   * or `undefined` if there is no such key.
   * @param key
   */
  public lowerEntry(key: K): [K, V] | undefined {
    const resultKey = this.lowerKey(key);
    if (resultKey != null) {
      const value = this.get(resultKey);
      return value === undefined ? undefined : [resultKey, value];
    }
    return undefined;
  }

  /**
   * Returns the greatest key from the keys less than the specified key,
   * or `undefined` if there is no such key.
   * @param key
   */
  public lowerKey(key: K): K | undefined {
    const filtered = this.sortedKeys.filter((existKey) => this.compare(existKey, key) < 0);
    return filtered.reverse()[0];
  }

  /**
   * Returns entry associated with the least key from the keys greater than the specified key,
   * or `undefined` if there is no such key.
   * @param key
   */
  public higherEntry(key: K): [K, V] | undefined {
    const resultKey = this.higherKey(key);
    if (resultKey != null) {
      const value = this.get(resultKey);
      return value === undefined ? undefined : [resultKey, value];
    }
    return undefined;
  }

  /**
   * Returns the least key from the keys greater than the specified key,
   * or `undefined` if there is no such key.
   * @param key
   */
  public higherKey(key: K): K | undefined {
    const filtered = this.sortedKeys.filter((existKey) => this.compare(existKey, key) > 0);
    return filtered[0];
  }

  /**
   * Returns a new TreeMap with entries containing keys less than (or equal to) `key` in this map.
   * @param key
   * @param include If `true`, split this map including an entry associated with `key`. Default is `true`.
   */
  public splitLower(key: K, include = true): TreeMap<K, V> {
    const entries = Array.from(this.entries()).filter((e) => {
      const range = this.compare(e[0], key) < 0;
      return include ? range || this.compare(e[0], key) === 0 : range;
    });
    return new TreeMap(entries, this.compareFn);
  }

  /**
   * Returns a new TreeMap with entries containing keys greater than (or equal to) `key` in this map.
   * @param key
   * @param include If `true`, split this map including an entry associated with `key`. Default is `true`.
   */
  public splitHigher(key: K, include = true): TreeMap<K, V> {
    const entries = Array.from(this.entries()).filter((e) => {
      const range = this.compare(e[0], key) > 0;
      return include ? range || this.compare(e[0], key) === 0 : range;
    });
    return new TreeMap(entries, this.compareFn);
  }

  public override forEach(
    callbackfn: (value: V, key: K, map: Map<K, V>) => void,
    thisArg?: unknown,
  ): void {
    Array.from(this.entries()).forEach(([k, v]) => {
      callbackfn(v, k, this);
    }, thisArg);
  }
}
