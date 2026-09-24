import type { TrackPayload } from "./types.js"

// Offline buffer for events that couldn't be delivered yet. Uses IndexedDB so events survive
// reloads, and falls back to memory when IndexedDB is unavailable (e.g. some private modes).

const DB_NAME = "analytics-db"
const STORE = "events"
// Oldest events are dropped beyond this, so a long offline period can't grow storage forever.
export const MAX_BUFFERED_EVENTS = 1000

export interface StoredEvent {
  source: "idb" | "memory"
  key: IDBValidKey
  value: TrackPayload
}

const txDone = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })

class IndexedDbStore {
  private db: Promise<IDBDatabase> | null = null

  private open() {
    if (!this.db) {
      this.db = new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1)
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains(STORE)) {
            req.result.createObjectStore(STORE, { autoIncrement: true })
          }
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
      this.db.catch(() => {
        this.db = null
      })
    }
    return this.db
  }

  async add(event: TrackPayload) {
    const db = await this.open()
    const tx = db.transaction(STORE, "readwrite")
    const store = tx.objectStore(STORE)
    store.add(event)
    const countReq = store.count()
    countReq.onsuccess = () => {
      let excess = countReq.result - MAX_BUFFERED_EVENTS
      if (excess <= 0) return
      // Keys are auto-incrementing, so the cursor visits the oldest events first.
      const cursorReq = store.openCursor()
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result
        if (!cursor || excess <= 0) return
        cursor.delete()
        excess--
        cursor.continue()
      }
    }
    await txDone(tx)
  }

  async read(limit: number) {
    const db = await this.open()
    const tx = db.transaction(STORE, "readonly")
    const out: StoredEvent[] = []
    await new Promise<void>((resolve, reject) => {
      const req = tx.objectStore(STORE).openCursor()
      req.onsuccess = () => {
        const cursor = req.result
        if (cursor && out.length < limit) {
          out.push({ source: "idb", key: cursor.key, value: cursor.value as TrackPayload })
          cursor.continue()
        } else {
          resolve()
        }
      }
      req.onerror = () => reject(req.error)
    })
    return out
  }

  // Deletes only the given keys, so events buffered during a flush are kept.
  async remove(keys: IDBValidKey[]) {
    if (!keys.length) return
    const db = await this.open()
    const tx = db.transaction(STORE, "readwrite")
    const store = tx.objectStore(STORE)
    for (const key of keys) store.delete(key)
    await txDone(tx)
  }
}

class MemoryStore {
  private items = new Map<number, TrackPayload>()
  private nextKey = 1

  add(event: TrackPayload) {
    this.items.set(this.nextKey++, event)
    while (this.items.size > MAX_BUFFERED_EVENTS) {
      this.items.delete(this.items.keys().next().value as number)
    }
  }

  read(limit: number): StoredEvent[] {
    return [...this.items.entries()].slice(0, limit).map(([key, value]) => ({ source: "memory", key, value }))
  }

  remove(keys: IDBValidKey[]) {
    for (const key of keys) this.items.delete(key as number)
  }
}

export class EventBuffer {
  private idb: IndexedDbStore | null = typeof indexedDB !== "undefined" ? new IndexedDbStore() : null
  private memory = new MemoryStore()

  constructor(private readonly log: (...args: unknown[]) => void) {}

  async add(event: TrackPayload) {
    if (this.idb) {
      try {
        await this.idb.add(event)
        return
      } catch (err) {
        this.log("IndexedDB unavailable, buffering in memory", err)
        this.idb = null
      }
    }
    this.memory.add(event)
  }

  async read(limit: number): Promise<StoredEvent[]> {
    let rows: StoredEvent[] = []
    if (this.idb) {
      try {
        rows = await this.idb.read(limit)
      } catch (err) {
        this.log("Failed to read IndexedDB buffer", err)
      }
    }
    return rows.concat(this.memory.read(limit - rows.length))
  }

  async remove(rows: StoredEvent[]) {
    this.memory.remove(rows.filter((r) => r.source === "memory").map((r) => r.key))
    const idbKeys = rows.filter((r) => r.source === "idb").map((r) => r.key)
    if (this.idb && idbKeys.length) await this.idb.remove(idbKeys)
  }
}
