import { Logger } from '@nestjs/common';
export declare class MagmaLogger extends Logger {
    private otelLogger;
    constructor(name?: string);
    log(message: string, context?: string): void;
}
