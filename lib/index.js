'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyvFile = exports.defaultOpts = void 0;
const tslib_1 = require("tslib");
const os = tslib_1.__importStar(require("os"));
const fs = tslib_1.__importStar(require("fs-extra"));
const events_1 = tslib_1.__importDefault(require("events"));
exports.defaultOpts = {
    deserialize: JSON.parse,
    dialect: 'redis',
    expiredCheckDelay: 24 * 3600 * 1000, // ms
    filename: `${os.tmpdir()}/keyv-file/default-rnd-${Math.random().toString(36).slice(2)}.json`,
    serialize: JSON.stringify,
    writeDelay: 100, // ms
};
function isNumber(val) {
    return typeof val === 'number';
}
class KeyvFile extends events_1.default {
    constructor(options) {
        super();
        this.ttlSupport = true;
        this.opts = Object.assign({}, exports.defaultOpts, options);
        try {
            const data = this.opts.deserialize(fs.readFileSync(this.opts.filename, 'utf8'));
            if (!Array.isArray(data.cache)) {
                const _cache = data.cache;
                data.cache = [];
                for (const key in _cache) {
                    if (_cache.hasOwnProperty(key)) {
                        data.cache.push([key, _cache[key]]);
                    }
                }
            }
            this._cache = new Map(data.cache);
            this._lastExpire = data.lastExpire;
        }
        catch (e) {
            this._cache = new Map();
            this._lastExpire = Date.now();
        }
    }
    get(key) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            try {
                const data = this._cache.get(key);
                if (!data) {
                    return undefined;
                }
                else if (this.isExpired(data)) {
                    yield this.delete(key);
                    return undefined;
                }
                else {
                    return data.value;
                }
            }
            catch (error) {
                // do nothing;
            }
        });
    }
    getMany(keys) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const results = yield Promise.all(keys.map((key) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                const value = yield this.get(key);
                return value;
            })));
            return results;
        });
    }
    set(key, value, ttl) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (ttl === 0) {
                ttl = undefined;
            }
            this._cache.set(key, {
                expire: isNumber(ttl)
                    ? Date.now() + ttl
                    : undefined,
                value: value
            });
            return this.save();
        });
    }
    delete(key) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const ret = this._cache.delete(key);
            yield this.save();
            return ret;
        });
    }
    deleteMany(keys) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const deletePromises = keys.map((key) => this.delete(key));
            const results = yield Promise.all(deletePromises);
            return results.every((result) => result);
        });
    }
    clear() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            this._cache = new Map();
            this._lastExpire = Date.now();
            return this.save();
        });
    }
    has(key) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return this._cache.has(key);
        });
    }
    isExpired(data) {
        return isNumber(data.expire) && data.expire <= Date.now();
    }
    clearExpire() {
        const now = Date.now();
        if (now - this._lastExpire <= this.opts.expiredCheckDelay) {
            return;
        }
        for (const key of this._cache.keys()) {
            const data = this._cache.get(key);
            if (this.isExpired(data)) {
                this._cache.delete(key);
            }
        }
        this._lastExpire = now;
    }
    saveToDisk() {
        const cache = [];
        for (const [key, val] of this._cache) {
            cache.push([key, val]);
        }
        const data = this.opts.serialize({
            cache,
            lastExpire: this._lastExpire,
        });
        return new Promise((resolve, reject) => {
            fs.outputFile(this.opts.filename, data, (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    save() {
        this.clearExpire();
        if (this._savePromise) {
            return this._savePromise;
        }
        this._savePromise = new Promise((resolve, reject) => {
            setTimeout(() => {
                this.saveToDisk().then(resolve, reject).finally(() => {
                    this._savePromise = void 0;
                });
            }, this.opts.writeDelay);
        });
        return this._savePromise;
    }
    disconnect() {
        return Promise.resolve();
    }
    // @ts-ignore
    *iterator(namespace) {
        for (const [key, data] of this._cache.entries()) {
            if (key === undefined) {
                continue;
            }
            // Filter by namespace if provided
            if (!namespace || key.includes(namespace)) {
                // faking async to be interface compliant
                yield Promise.resolve([key, data.value]);
            }
        }
    }
}
exports.KeyvFile = KeyvFile;
exports.default = KeyvFile;
