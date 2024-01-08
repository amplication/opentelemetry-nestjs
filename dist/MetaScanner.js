"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetadataScanner = void 0;
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
class MetadataScanner {
    cachedScannedPrototypes = new Map();
    scanFromPrototype(instance, prototype, callback) {
        if (!prototype) {
            return [];
        }
        const visitedNames = new Map();
        const result = [];
        do {
            for (const property of Object.getOwnPropertyNames(prototype)) {
                if (visitedNames.has(property)) {
                    continue;
                }
                visitedNames.set(property, true);
                const descriptor = Object.getOwnPropertyDescriptor(prototype, property);
                if (descriptor.set ||
                    descriptor.get ||
                    (0, shared_utils_1.isConstructor)(property) ||
                    !(0, shared_utils_1.isFunction)(prototype[property])) {
                    continue;
                }
                const value = callback(property);
                if ((0, shared_utils_1.isNil)(value)) {
                    continue;
                }
                result.push(value);
            }
        } while ((prototype = Reflect.getPrototypeOf(prototype)) &&
            prototype !== Object.prototype);
        return result;
    }
    *getAllFilteredMethodNames(prototype) {
        yield* this.getAllMethodNames(prototype);
    }
    getAllMethodNames(prototype) {
        if (!prototype) {
            return [];
        }
        if (this.cachedScannedPrototypes.has(prototype)) {
            return this.cachedScannedPrototypes.get(prototype);
        }
        const visitedNames = new Map();
        const result = [];
        this.cachedScannedPrototypes.set(prototype, result);
        do {
            for (const property of Object.getOwnPropertyNames(prototype)) {
                if (visitedNames.has(property)) {
                    continue;
                }
                visitedNames.set(property, true);
                const descriptor = Object.getOwnPropertyDescriptor(prototype, property);
                if (descriptor.set ||
                    descriptor.get ||
                    (0, shared_utils_1.isConstructor)(property) ||
                    !(0, shared_utils_1.isFunction)(prototype[property])) {
                    continue;
                }
                result.push(property);
            }
        } while ((prototype = Reflect.getPrototypeOf(prototype)) &&
            prototype !== Object.prototype);
        return result;
    }
}
exports.MetadataScanner = MetadataScanner;
//# sourceMappingURL=MetaScanner.js.map