import type { AllTypes, BaseModel, IDatabase, Operation, Query } from 'insomnia-data';
import { models } from 'insomnia-data';
import { generateId } from 'insomnia-data/common';

// ─── In-memory IDatabase implementation ───────────────────────────────────────
// Satisfies the IDatabase contract without any file I/O or Node.js APIs.
// Used exclusively by the web research prototype (entry.web.tsx).

type Store = Map<AllTypes, Map<string, BaseModel>>;

type ChangeType = 'insert' | 'update' | 'remove';
type ChangeBufferEvent = [ChangeType, BaseModel, Partial<BaseModel>[]];
type ChangeListener = (changes: ChangeBufferEvent[]) => void;

// ─── Query matching ────────────────────────────────────────────────────────────

function matchesQuery(doc: BaseModel, query: Query<any> | string): boolean {
  if (typeof query === 'string') {
    return (doc as any)._id === query;
  }
  for (const [key, condition] of Object.entries(query)) {
    if (key === '$or') {
      const subQueries = condition as Query<any>[];
      if (!subQueries.some(sq => matchesQuery(doc, sq))) return false;
      continue;
    }
    const value = (doc as any)[key];
    if (condition === null || condition === undefined) {
      if (value !== null && value !== undefined) return false;
    } else if (typeof condition === 'object') {
      if ('$in' in condition) {
        if (!condition.$in!.includes(value)) return false;
      }
      if ('$nin' in condition) {
        if (condition.$nin!.includes(value)) return false;
      }
      if ('$ne' in condition) {
        if (value === condition.$ne) return false;
      }
      if ('$gt' in condition) {
        if (!(value > condition.$gt!)) return false;
      }
      if ('$lt' in condition) {
        if (!(value < condition.$lt!)) return false;
      }
      if ('$exists' in condition) {
        const exists = value !== undefined && value !== null;
        if (exists !== condition.$exists) return false;
      }
      if ('$regex' in condition) {
        const re = condition.$regex instanceof RegExp ? condition.$regex : new RegExp(condition.$regex as string);
        if (!re.test(String(value))) return false;
      }
      if ('$elemMatch' in condition) {
        if (!Array.isArray(value)) return false;
        if (!value.some((el: any) => matchesQuery(el, condition.$elemMatch as Query<any>))) return false;
      }
    } else {
      if (value !== condition) return false;
    }
  }
  return true;
}

function sortDocs<T extends BaseModel>(docs: T[], sort: Record<string, any>): T[] {
  const entries = Object.entries(sort);
  if (!entries.length) return docs;
  return [...docs].sort((a, b) => {
    for (const [key, dir] of entries) {
      const av = (a as any)[key];
      const bv = (b as any)[key];
      if (av === bv) continue;
      const order = av < bv ? -1 : 1;
      return dir === -1 || dir === 'desc' ? -order : order;
    }
    return 0;
  });
}

// ─── Model initialization ──────────────────────────────────────────────────────

function initModelDefaults<T extends BaseModel>(type: AllTypes, ...sources: Partial<T>[]): T {
  const model = models.getModel(type);
  if (!model) throw new Error(`Unknown model type: ${type}`);

  const now = Date.now();
  const defaults: Record<string, any> = {
    _id: null,
    type,
    parentId: null,
    modified: now,
    created: now,
    isPrivate: false,
    name: '',
    ...model.init(),
  };

  const merged = Object.assign({}, defaults, ...sources) as any;
  if (!merged._id) {
    merged._id = generateId(model.prefix);
  }
  return merged as T;
}

// ─── Change buffer ─────────────────────────────────────────────────────────────

function createChangeBuffer() {
  let buffering = false;
  let bufferId = 1;
  let buffer: ChangeBufferEvent[] = [];
  let listeners: ChangeListener[] = [];

  function notify(event: ChangeType, doc: BaseModel, patches: Partial<BaseModel>[] = []) {
    buffer.push([event, doc, patches]);
    if (!buffering) {
      flush();
    }
  }

  async function flush(id = 0, fake = false): Promise<void> {
    if (id !== 0 && bufferId !== id) return;
    buffering = false;
    const changes = [...buffer];
    buffer = [];
    if (changes.length === 0 || fake) return;
    for (const fn of listeners) {
      await fn(changes);
    }
  }

  return {
    notify,
    flush,
    addListener: (fn: ChangeListener) => { listeners.push(fn); },
    startBuffering: (millis?: number): number => {
      buffering = true;
      const id = ++bufferId;
      if (millis !== undefined) setTimeout(() => flush(id), millis);
      return id;
    },
  };
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createInMemoryDatabase(): IDatabase {
  const store: Store = new Map();
  const changes = createChangeBuffer();

  function getCollection(type: AllTypes): Map<string, BaseModel> {
    if (!store.has(type)) store.set(type, new Map());
    return store.get(type)!;
  }

  const db: IDatabase = {
    init: async () => { /* no-op — memory needs no initialization */ },

    onChange: (callback: ChangeListener) => { changes.addListener(callback); },

    bufferChanges: async (millis = 1000) => changes.startBuffering(millis),

    bufferChangesIndefinitely: async () => changes.startBuffering(),

    flushChanges: async (id = 0, fake = false) => changes.flush(id, fake),

    count: async <T extends BaseModel>(type: AllTypes, query: Query<T> = {}) => {
      const col = getCollection(type);
      let n = 0;
      for (const doc of col.values()) {
        if (matchesQuery(doc, query)) n++;
      }
      return n;
    },

    find: async <T extends BaseModel>(
      type: AllTypes,
      query: Query<T> | string = {},
      sort: Record<string, any> = { created: 1 },
      limit = 0,
    ): Promise<T[]> => {
      const col = getCollection(type);
      let results: T[] = [];
      for (const doc of col.values()) {
        if (matchesQuery(doc, query)) results.push(doc as T);
      }
      results = sortDocs(results, sort);
      return limit > 0 ? results.slice(0, limit) : results;
    },

    findOne: async <T extends BaseModel>(
      type: AllTypes,
      query: Query<T> | string = {},
      sort: Record<string, any> = { created: 1 },
    ): Promise<T | undefined> => {
      const col = getCollection(type);
      const results: T[] = [];
      for (const doc of col.values()) {
        if (matchesQuery(doc, query)) results.push(doc as T);
      }
      return sortDocs(results, sort)[0];
    },

    insert: async <T extends BaseModel>(doc: T): Promise<T> => {
      const full = initModelDefaults<T>(doc.type, doc);
      getCollection(full.type).set(full._id, full);
      changes.notify('insert', full);
      return full;
    },

    update: async <T extends BaseModel>(doc: T, patches: Partial<T>[] = []): Promise<T> => {
      const full = initModelDefaults<T>(doc.type, doc, { modified: Date.now() } as Partial<T>);
      getCollection(full.type).set(full._id, full);
      changes.notify('update', full, patches);
      return full;
    },

    docCreate: async <T extends BaseModel>(type: AllTypes, ...patches: Partial<T>[]): Promise<T> => {
      const doc = initModelDefaults<T>(type, ...patches, { type } as Partial<T>);
      getCollection(type).set(doc._id, doc);
      changes.notify('insert', doc);
      return doc;
    },

    docUpdate: async <T extends BaseModel>(originalDoc: T, ...patches: Partial<T>[]): Promise<T> => {
      const doc = initModelDefaults<T>(
        originalDoc.type,
        originalDoc,
        { modified: Date.now() } as Partial<T>,
        ...patches,
      );
      getCollection(doc.type).set(doc._id, doc);
      changes.notify('update', doc, patches);
      return doc;
    },

    duplicate: async <T extends BaseModel>(originalDoc: T, patch: Partial<T> = {}): Promise<T> => {
      const flushId = await db.bufferChanges();
      const idMapping = new Map<string, string>();
      const descendantMap = models.getAllDescendantMap();

      const allDescendants: BaseModel[] = [];

      async function collect(doc: BaseModel): Promise<void> {
        const model = models.mustGetModel(doc.type);
        idMapping.set(doc._id, generateId(model.prefix));
        const childTypes = (descendantMap[doc.type] ?? []).filter(t => models.canDuplicate(t));
        for (const childType of childTypes) {
          const children = await db.find(childType, { parentId: doc._id });
          for (const child of children) {
            allDescendants.push(child);
            await collect(child);
          }
        }
      }
      await collect(originalDoc);

      const now = Date.now();
      const rewriteId = (id: string) => idMapping.get(id) ?? id;

      const rootDoc: T = {
        ...models.rewriteReferences(originalDoc, idMapping),
        ...patch,
        _id: idMapping.get(originalDoc._id)!,
        modified: now,
        created: now,
        type: originalDoc.type,
      } as T;
      getCollection(originalDoc.type).set(rootDoc._id, rootDoc);
      changes.notify('insert', rootDoc);

      for (const desc of allDescendants) {
        const newDoc: BaseModel = {
          ...models.rewriteReferences(desc, idMapping),
          _id: rewriteId(desc._id),
          parentId: rewriteId(desc.parentId),
          modified: now,
          created: now,
          type: desc.type,
        };
        getCollection(desc.type).set(newDoc._id, newDoc);
        changes.notify('insert', newDoc);
      }

      await db.flushChanges(flushId);
      return rootDoc;
    },

    batchModifyDocs: async ({ upsert = [], remove = [] }: Operation): Promise<void> => {
      const flushId = await db.bufferChanges();
      await Promise.all(upsert.map(doc => db.update(doc)));
      await Promise.all(remove.map(doc => db.unsafeRemove(doc)));
      await db.flushChanges(flushId);
    },

    remove: async <T extends BaseModel>(doc: T): Promise<void> => {
      const flushId = await db.bufferChanges();
      const docs = await db.getWithDescendants(doc);
      for (const d of docs) {
        getCollection(d.type).delete(d._id);
        changes.notify('remove', d);
      }
      await db.flushChanges(flushId);
    },

    removeWhere: async <T extends BaseModel>(type: AllTypes, query: Query<T>): Promise<void> => {
      const flushId = await db.bufferChanges();
      const toRemove = await db.find<T>(type, query);
      for (const doc of toRemove) {
        await db.remove(doc);
      }
      await db.flushChanges(flushId);
    },

    unsafeRemove: async <T extends BaseModel>(doc: T): Promise<void> => {
      getCollection(doc.type).delete(doc._id);
      changes.notify('remove', doc);
    },

    withAncestors: async <T extends BaseModel>(doc: T | undefined, types: AllTypes[] = []): Promise<T[]> => {
      if (!doc) return [];
      const allTypes: AllTypes[] = types.length ? types : (Array.from(store.keys()) as AllTypes[]);
      const result: T[] = [doc];

      async function walkUp(current: T): Promise<void> {
        if (!current.parentId) return;
        for (const type of allTypes) {
          const parent = await db.findOne<T>(type, { _id: current.parentId });
          if (parent) {
            result.push(parent);
            await walkUp(parent);
            return;
          }
        }
      }
      await walkUp(doc);
      return result;
    },

    getWithDescendants: async <T extends BaseModel>(doc: T, types: AllTypes[] = []): Promise<BaseModel[]> => {
      const descendantMap = types.length ? models.generateDescendantMap(types) : models.getAllDescendantMap();
      const result: BaseModel[] = [doc];

      async function walkDown(docs: BaseModel[]): Promise<void> {
        const nextBatch: BaseModel[] = [];
        for (const d of docs) {
          const childTypes = descendantMap[d.type] ?? [];
          for (const childType of childTypes) {
            const children = await db.find(childType, { parentId: d._id });
            for (const child of children) {
              result.push(child);
              nextBatch.push(child);
            }
          }
        }
        if (nextBatch.length) await walkDown(nextBatch);
      }
      await walkDown([doc]);
      return result;
    },
  };

  return db;
}
