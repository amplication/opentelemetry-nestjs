import { DynamicModule } from '@nestjs/common';
interface MagmaLoggerOptions {
    name?: string;
}
export declare class MagmaLoggerModule {
    static forRoot(options: MagmaLoggerOptions): DynamicModule;
}
export {};
