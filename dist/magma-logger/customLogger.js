"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MagmaLogger = void 0;
const common_1 = require("@nestjs/common");
const api_logs_1 = require("@opentelemetry/api-logs");
class MagmaLogger extends common_1.Logger {
    otelLogger;
    constructor(name) {
        super();
        this.otelLogger = api_logs_1.logs.getLogger(name || 'default');
    }
    log(message, context) {
        super.log(message, context);
        this.otelLogger.emit({
            severityNumber: api_logs_1.SeverityNumber.INFO,
            body: JSON.stringify({ message: message }),
        });
    }
}
exports.MagmaLogger = MagmaLogger;
//# sourceMappingURL=customLogger.js.map