import type { TrackPayload } from "./types.js";
export declare const MAX_BUFFERED_EVENTS = 1000;
export interface StoredEvent {
    source: "idb" | "memory";
    key: IDBValidKey;
    value: TrackPayload;
}
export declare class EventBuffer {
    private readonly log;
    private idb;
    private memory;
    constructor(log: (...args: unknown[]) => void);
    add(event: TrackPayload): Promise<void>;
    read(limit: number): Promise<StoredEvent[]>;
    remove(rows: StoredEvent[]): Promise<void>;
}
