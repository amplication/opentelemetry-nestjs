import { Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Injector } from './Injector';
import { APP_INTERCEPTOR, ModulesContainer } from '@nestjs/core';
import { BaseTraceInjector } from './BaseTraceInjector';
import { INTERCEPTORS_METADATA } from '@nestjs/common/constants';

@Injectable()
export class InterceptorInjector extends BaseTraceInjector implements Injector {
  private readonly loggerService = new Logger();

  constructor(protected readonly modulesContainer: ModulesContainer) {
    super(modulesContainer);
  }

  public inject() {
    const controllers = this.getControllers();

    for (const controller of controllers) {
      if (this.isIntercepted(controller.metatype)) {
        const interceptors = this.getInterceptors(controller.metatype).map(
          (interceptor) => {
            const prototype = interceptor['prototype'] ?? interceptor;
            const traceName = `Interceptor->${controller.name}.${prototype.constructor.name}`;
            prototype.intercept = this.wrap(prototype.intercept, traceName, {
              controller: controller.name,
              interceptor: prototype.constructor.name,
              scope: 'CONTROLLER',
            });
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
            const traceName = `Interceptor->${controller.name}.${controller.metatype.prototype[key].name}.${prototype.constructor.name}`;
            prototype.intercept = this.wrap(prototype.intercept, traceName, {
              controller: controller.name,
              interceptor: prototype.constructor.name,
              method: controller.metatype.prototype[key].name,
              scope: 'CONTROLLER_METHOD',
            });
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

    this.injectGlobals();
  }

  private injectGlobals() {
    const providers = this.getProviders();

    for (const provider of providers) {
      if (
        typeof provider.token === 'string' &&
        provider.token.includes(APP_INTERCEPTOR) &&
        !this.isAffected(provider.metatype.prototype.intercept)
      ) {
        const traceName = `Interceptor->Global->${provider.metatype.name}`;
        provider.metatype.prototype.intercept = this.wrap(
          provider.metatype.prototype.intercept,
          traceName,
          {
            interceptor: provider.metatype.name,
            scope: 'GLOBAL',
          },
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
