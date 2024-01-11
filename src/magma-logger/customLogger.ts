import { Logger } from '@nestjs/common';
import {
  logs,
  SeverityNumber,
  Logger as OtelLogger,
} from '@opentelemetry/api-logs';

export class MagmaLogger extends Logger {
  private otelLogger: OtelLogger;

  constructor(name?: string) {
    super();
    this.otelLogger = logs.getLogger(name || 'default');
  }

  log(message: string, context?: string) {
    super.log(message, context);

    this.otelLogger.emit({
      severityNumber: SeverityNumber.INFO,
      body: JSON.stringify({ message: message }),
    });
  }
}
