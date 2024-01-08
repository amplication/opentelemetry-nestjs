"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NoopTraceExporter = void 0;
class NoopTraceExporter {
    export() {
    }
    shutdown() {
        return Promise.resolve(undefined);
    }
}
exports.NoopTraceExporter = NoopTraceExporter;
//# sourceMappingURL=NoopTraceExporter.js.map