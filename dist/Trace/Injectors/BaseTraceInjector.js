"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseTraceInjector = void 0;
const Constants_1 = require("../../Constants");
const constants_1 = require("@nestjs/common/constants");
const constants_2 = require("@nestjs/microservices/constants");
const TraceWrapper_1 = require("../TraceWrapper");
const MetaScanner_1 = require("../../MetaScanner");
class BaseTraceInjector {
    modulesContainer;
    metadataScanner = new MetaScanner_1.MetadataScanner();
    constructor(modulesContainer) {
        this.modulesContainer = modulesContainer;
    }
    *getControllers() {
        for (const module of this.modulesContainer.values()) {
            for (const controller of module.controllers.values()) {
                if (controller && controller.metatype?.prototype) {
                    yield controller;
                }
            }
        }
    }
    *getProviders() {
        for (const module of this.modulesContainer.values()) {
            for (const provider of module.providers.values()) {
                if (provider && provider.metatype?.prototype) {
                    yield provider;
                }
            }
        }
    }
    isPath(prototype) {
        return Reflect.hasMetadata(constants_1.PATH_METADATA, prototype);
    }
    isMicroservice(prototype) {
        return Reflect.hasMetadata(constants_2.PATTERN_METADATA, prototype);
    }
    isAffected(prototype) {
        return Reflect.hasMetadata(Constants_1.Constants.TRACE_METADATA_ACTIVE, prototype);
    }
    getTraceName(prototype) {
        return Reflect.getMetadata(Constants_1.Constants.TRACE_METADATA, prototype);
    }
    isDecorated(prototype) {
        return Reflect.hasMetadata(Constants_1.Constants.TRACE_METADATA, prototype);
    }
    reDecorate(source, destination) {
        const keys = Reflect.getMetadataKeys(source);
        for (const key of keys) {
            const meta = Reflect.getMetadata(key, source);
            Reflect.defineMetadata(key, meta, destination);
        }
    }
    wrap(prototype, traceName, attributes = {}, spanKind) {
        return TraceWrapper_1.TraceWrapper.wrap(prototype, traceName, attributes, spanKind);
    }
    affect(prototype) {
        Reflect.defineMetadata(Constants_1.Constants.TRACE_METADATA_ACTIVE, 1, prototype);
    }
}
exports.BaseTraceInjector = BaseTraceInjector;
//# sourceMappingURL=BaseTraceInjector.js.map