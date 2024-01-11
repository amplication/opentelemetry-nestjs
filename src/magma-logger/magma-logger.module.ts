import { DynamicModule, Module, Global, Provider } from '@nestjs/common';
import { MagmaLogger } from './customLogger';

interface MagmaLoggerOptions {
  name?: string;
}

@Global()
@Module({})
export class MagmaLoggerModule {
  static forRoot(options: MagmaLoggerOptions): DynamicModule {
    const customLoggerProvider: Provider = {
      provide: MagmaLogger,
      useValue: new MagmaLogger(options.name),
    };

    return {
      module: MagmaLoggerModule,
      providers: [customLoggerProvider],
      exports: [customLoggerProvider],
    };
  }
}
