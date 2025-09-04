import { Injectable, Logger } from '@nestjs/common';
import { Instrumentation } from './Instrumentation';
import { ModulesContainer } from '@nestjs/core';
import { BaseTraceInstrumentation } from './BaseTraceInstrumentation';

@Injectable()
export class EventEmitterInstrumentation
  extends BaseTraceInstrumentation
  implements Instrumentation
{
  private static EVENT_LISTENER_METADATA = 'EVENT_LISTENER_METADATA';

  private readonly loggerService = new Logger();

  constructor(protected readonly modulesContainer: ModulesContainer) {
    super(modulesContainer);
  }

  public setupInstrumentation() {
    const providers = this.getProviders();

    for (const provider of providers) {
      const keys = this.metadataScanner.getAllMethodNames(
        provider.metatype.prototype,
      );

      for (const key of keys) {
        if (
          !this.isDecorated(provider.metatype.prototype[key]) &&
          !this.isAffected(provider.metatype.prototype[key]) &&
          this.isEventConsumer(provider.metatype.prototype[key])
        ) {
          const eventName = this.getEventName(provider.metatype.prototype[key]);
          provider.metatype.prototype[key] = this.wrap(
            provider.metatype.prototype[key],
            `${provider.name}.${eventName}`,
            {
              'nestjs.type': 'event',
              'nestjs.provider': provider.name,
              'nestjs.callback': provider.metatype.prototype[key].name,
              'nestjs.event': eventName,
            },
          );
          this.loggerService.log(
            `Mapped ${provider.name}.${key}`,
            this.constructor.name,
          );
        }
      }
    }
  }

  private isEventConsumer(prototype): boolean {
    return Reflect.getMetadata(
      EventEmitterInstrumentation.EVENT_LISTENER_METADATA,
      prototype,
    );
  }

  private getEventName(prototype): string {
    const metadata: Array<{ event: string }> = Reflect.getMetadata(
      EventEmitterInstrumentation.EVENT_LISTENER_METADATA,
      prototype,
    );
    return metadata[0].event;
  }
}
