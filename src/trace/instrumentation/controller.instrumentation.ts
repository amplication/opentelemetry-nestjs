import { Injectable, Logger } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { BaseTraceInstrumentation } from './base-trace.instrumentation';
import { Instrumentation } from './Instrumentation';
import { SpanKind } from '@opentelemetry/api';

@Injectable()
export class ControllerInstrumentation
  extends BaseTraceInstrumentation
  implements Instrumentation
{
  private readonly loggerService = new Logger();

  constructor(protected readonly modulesContainer: ModulesContainer) {
    super(modulesContainer);
  }

  public setupInstrumentation() {
    const controllers = this.getControllers();

    for (const controller of controllers) {
      const keys = this.metadataScanner.getAllMethodNames(
        controller.metatype.prototype,
      );

      for (const key of keys) {
        if (
          !this.isDecorated(controller.metatype.prototype[key]) &&
          !this.isAffected(controller.metatype.prototype[key]) &&
          (this.isPath(controller.metatype.prototype[key]) ||
            this.isMicroservice(controller.metatype.prototype[key]))
        ) {
          const traceName = `${controller.name}.${controller.metatype.prototype[key].name}`;
          const method = this.wrap(
            controller.metatype.prototype[key],
            traceName,
            {
              'nestjs.type': 'handler',
              'nestjs.controller': controller.name,
              'nestjs.callback': controller.metatype.prototype[key].name,
            },
            { kind: SpanKind.SERVER },
          );
          this.reDecorate(controller.metatype.prototype[key], method);

          controller.metatype.prototype[key] = method;
          this.loggerService.log(
            `Mapped ${controller.name}.${key}`,
            this.constructor.name,
          );
        }
      }
    }
  }
}
