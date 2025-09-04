import { Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Instrumentation } from './Instrumentation';
import { APP_INTERCEPTOR, ModulesContainer } from '@nestjs/core';
import { BaseTraceInstrumentation } from './base-trace.instrumentation';
import { INTERCEPTORS_METADATA } from '@nestjs/common/constants';

@Injectable()
export class InterceptorInstrumentation
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
      if (this.isIntercepted(controller.metatype)) {
        const interceptors = this.getInterceptors(controller.metatype).map(
          (interceptor) => {
            const prototype = interceptor['prototype'] ?? interceptor;
            const traceName = `${controller.name}.${prototype.constructor.name}`;
            prototype.intercept = this.wrap(
              prototype.intercept,
              traceName,
              {
                'nestjs.controller': controller.name,
                'nestjs.type': 'interceptor',
                'nestjs.provider': prototype.constructor.name,
                'nestjs.scope': 'controller',
              },
              { wrapObservable: true },
            );
            Object.assign(prototype, this);
            this.loggerService.log(
              `Mapped ${traceName}`,
              this.constructor.name,
            );
            return interceptor;
          },
        );

        if (interceptors.length > 0) {
          Reflect.defineMetadata(
            INTERCEPTORS_METADATA,
            interceptors,
            controller.metatype,
          );
        }
      }

      const keys = this.metadataScanner.getAllMethodNames(
        controller.metatype.prototype,
      );

      for (const key of keys) {
        if (this.isIntercepted(controller.metatype.prototype[key])) {
          const interceptors = this.getInterceptors(
            controller.metatype.prototype[key],
          ).map((interceptor) => {
            const prototype = interceptor['prototype'] ?? interceptor;
            const traceName = `${controller.name}.${controller.metatype.prototype[key].name}.${prototype.constructor.name}`;
            prototype.intercept = this.wrap(
              prototype.intercept,
              traceName,
              {
                'nestjs.type': 'interceptor',
                'nestjs.controller': controller.name,
                'nestjs.provider': prototype.constructor.name,
                'nestjs.callback': controller.metatype.prototype[key].name,
                'nestjs.scope': 'controller_method',
              },
              { wrapObservable: true },
            );
            Object.assign(prototype, this);
            this.loggerService.log(
              `Mapped ${traceName}`,
              this.constructor.name,
            );
            return interceptor;
          });

          if (interceptors.length > 0) {
            Reflect.defineMetadata(
              INTERCEPTORS_METADATA,
              interceptors,
              controller.metatype.prototype[key],
            );
          }
        }
      }
    }

    this.patchGlobals();
  }

  private patchGlobals() {
    const providers = this.getProviders();

    for (const provider of providers) {
      if (
        typeof provider.token === 'string' &&
        provider.token.includes(APP_INTERCEPTOR) &&
        !this.isAffected(provider.metatype.prototype.intercept)
      ) {
        const traceName = provider.metatype.name;
        provider.metatype.prototype.intercept = this.wrap(
          provider.metatype.prototype.intercept,
          traceName,
          {
            'nestjs.type': 'interceptor',
            'nestjs.provider': provider.metatype.name,
            'nestjs.scope': 'global',
          },
          { wrapObservable: true },
        );
        Object.assign(provider.metatype.prototype, this);
        this.loggerService.log(`Mapped ${traceName}`, this.constructor.name);
      }
    }
  }

  private getInterceptors(prototype): NestInterceptor[] {
    return Reflect.getMetadata(INTERCEPTORS_METADATA, prototype) || [];
  }

  private isIntercepted(prototype): boolean {
    return Reflect.hasMetadata(INTERCEPTORS_METADATA, prototype);
  }
}
