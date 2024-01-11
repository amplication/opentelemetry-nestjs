"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MagmaLoggerModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MagmaLoggerModule = void 0;
const common_1 = require("@nestjs/common");
const customLogger_1 = require("./customLogger");
let MagmaLoggerModule = MagmaLoggerModule_1 = class MagmaLoggerModule {
    static forRoot(options) {
        const customLoggerProvider = {
            provide: customLogger_1.MagmaLogger,
            useValue: new customLogger_1.MagmaLogger(options.name),
        };
        return {
            module: MagmaLoggerModule_1,
            providers: [customLoggerProvider],
            exports: [customLoggerProvider],
        };
    }
};
exports.MagmaLoggerModule = MagmaLoggerModule;
exports.MagmaLoggerModule = MagmaLoggerModule = MagmaLoggerModule_1 = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({})
], MagmaLoggerModule);
//# sourceMappingURL=magma-logger.module.js.map