import EventEmitter from 'events';
import type { KeyvStoreAdapter, StoredData } from 'keyv';
export interface Options {
    deserialize: (val: any) => any;
    dialect: string;
    expiredCheckDelay: number;
    filename: string;
    serialize: (val: any) => any;
    writeDelay: number;
}
export declare const defaultOpts: Options;
export declare class KeyvFile extends EventEmitter implements KeyvStoreAdapter {
    ttlSupport: boolean;
    namespace?: string;
    opts: Options;
    private _cache;
    private _lastExpire;
    constructor(options?: Options);
    get<Value>(key: string): Promise<StoredData<Value> | undefined>;
    getMany<Value>(keys: string[]): Promise<Array<StoredData<Value | undefined>>>;
    set(key: string, value: any, ttl?: number): Promise<any>;
    delete(key: string): Promise<boolean>;
    deleteMany(keys: string[]): Promise<boolean>;
    clear(): Promise<any>;
    has(key: string): Promise<boolean>;
    private isExpired;
    private clearExpire;
    private saveToDisk;
    private _savePromise?;
    private save;
    disconnect(): Promise<void>;
    iterator(namespace?: string): Generator<Promise<any[]>, void, unknown>;
}
export default KeyvFile;
