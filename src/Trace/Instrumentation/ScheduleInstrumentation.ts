import { Injectable, Logger } from '@nestjs/common';
import { Instrumentation } from './Instrumentation';
import { ModulesContainer } from '@nestjs/core';
import { BaseTraceInstrumentation } from './BaseTraceInstrumentation';

@Injectable()
export class ScheduleInstrumentation
  extends BaseTraceInstrumentation
  implements Instrumentation
{
  private static SCHEDULE_CRON_OPTIONS = 'SCHEDULE_CRON_OPTIONS';
  private static SCHEDULE_INTERVAL_OPTIONS = 'SCHEDULE_INTERVAL_OPTIONS';
  private static SCHEDULE_TIMEOUT_OPTIONS = 'SCHEDULE_TIMEOUT_OPTIONS';
  private static SCHEDULER_NAME = 'SCHEDULER_NAME';

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
          this.isScheduler(provider.metatype.prototype[key])
        ) {
          const name = this.getName(provider.metatype.prototype[key]);
          provider.metatype.prototype[key] = this.wrap(
            provider.metatype.prototype[key],
            `${provider.name}.${name}`,
            {
              'nestjs.type': 'schedule',
              'nestjs.provider': provider.name,
              'nestjs.callback': provider.metatype.prototype[key].name,
              'nestjs.schedule_type': this.isCron(provider.metatype.prototype)
                ? 'cron'
                : this.isTimeout(provider.metatype.prototype)
                  ? 'timeout'
                  : 'interval',
              ...(this.hasName(provider.metatype.prototype[key])
                ? { 'nestjs.name': name }
                : {}),
            },
          );
          this.loggerService.log(`Mapped ${name}`, this.constructor.name);
        }
      }
    }
  }

  private isScheduler(prototype): boolean {
    return (
      this.isCron(prototype) ||
      this.isTimeout(prototype) ||
      this.isInterval(prototype)
    );
  }

  private isCron(prototype): boolean {
    return Reflect.hasMetadata(
      ScheduleInstrumentation.SCHEDULE_CRON_OPTIONS,
      prototype,
    );
  }

  private isTimeout(prototype): boolean {
    return Reflect.hasMetadata(
      ScheduleInstrumentation.SCHEDULE_TIMEOUT_OPTIONS,
      prototype,
    );
  }

  private isInterval(prototype): boolean {
    return Reflect.hasMetadata(
      ScheduleInstrumentation.SCHEDULE_INTERVAL_OPTIONS,
      prototype,
    );
  }

  private getName(prototype): string {
    if (this.isCron(prototype)) {
      const options = Reflect.getMetadata(
        ScheduleInstrumentation.SCHEDULE_CRON_OPTIONS,
        prototype,
      );
      return options?.name ?? prototype.name;
    }

    if (this.isTimeout(prototype) || this.isInterval(prototype)) {
      const name = Reflect.getMetadata(
        ScheduleInstrumentation.SCHEDULER_NAME,
        prototype,
      );
      return name ?? prototype.name;
    }
  }

  private hasName(prototype): boolean {
    if (this.isCron(prototype)) {
      const options = Reflect.getMetadata(
        ScheduleInstrumentation.SCHEDULE_CRON_OPTIONS,
        prototype,
      );
      return !!options?.name;
    }

    if (this.isTimeout(prototype) || this.isInterval(prototype)) {
      const name = Reflect.getMetadata(
        ScheduleInstrumentation.SCHEDULER_NAME,
        prototype,
      );
      return !!name;
    }
  }
}
