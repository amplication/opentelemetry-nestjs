import { Injectable, Logger, PipeTransform } from '@nestjs/common';
import { Instrumentation } from './Instrumentation';
import { APP_PIPE, ModulesContainer } from '@nestjs/core';
import { BaseTraceInstrumentation } from './base-trace.instrumentation';
import { PIPES_METADATA } from '@nestjs/common/constants';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';

@Injectable()
export class PipeInstrumentation
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
        if (this.isPath(controller.metatype.prototype[key])) {
          const pipes = this.getPipes(controller.metatype.prototype[key]).map(
            (pipe) =>
              this.wrapPipe(
                pipe,
                controller,
                controller.metatype.prototype[key],
              ),
          );

          if (pipes.length > 0) {
            Reflect.defineMetadata(
              PIPES_METADATA,
              pipes,
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
        provider.token.includes(APP_PIPE) &&
        !this.isAffected(provider.metatype.prototype.transform)
      ) {
        const traceName = provider.metatype.name;
        provider.metatype.prototype.transform = this.wrap(
          provider.metatype.prototype.transform,
          traceName,
          {
            'nestjs.type': 'pipe',
            'nestjs.provider': provider.metatype.name,
            'nestjs.scope': 'global',
          },
        );
        this.loggerService.log(`Mapped ${traceName}`, this.constructor.name);
      }
    }
  }

  private wrapPipe(
    pipe: PipeTransform,
    controller: InstanceWrapper,
    prototype,
  ): PipeTransform {
    const pipeProto = pipe['prototype'] ?? pipe;
    if (this.isAffected(pipeProto.transform)) return pipe;

    const traceName = `${controller.name}.${prototype.name}.${pipeProto.constructor.name}`;
    pipeProto.transform = this.wrap(pipeProto.transform, traceName, {
      'nestjs.controller': controller.name,
      'nestjs.type': 'pipe',
      'nestjs.callback': prototype.name,
      'nestjs.provider': pipeProto.constructor.name,
      'nestjs.scope': 'controller_method',
    });
    this.loggerService.log(`Mapped ${traceName}`, this.constructor.name);
    return pipeProto;
  }

  private getPipes(prototype): PipeTransform[] {
    return Reflect.getMetadata(PIPES_METADATA, prototype) || [];
  }
}
