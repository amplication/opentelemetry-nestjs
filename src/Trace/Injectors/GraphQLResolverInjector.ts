import { Injectable, Logger } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import {
  RESOLVER_NAME_METADATA,
  RESOLVER_TYPE_METADATA,
} from '@nestjs/graphql/dist/graphql.constants';
import { BaseTraceInjector } from './BaseTraceInjector';
import { Injector } from './Injector';

@Injectable()
export class GraphQLResolverInjector
  extends BaseTraceInjector
  implements Injector
{
  private readonly loggerService = new Logger();

  constructor(protected readonly modulesContainer: ModulesContainer) {
    super(modulesContainer);
  }

  public inject() {
    const providers = this.getProviders();
    for (const provider of providers) {
      const isGraphQlResolver = Reflect.hasMetadata(
        RESOLVER_NAME_METADATA,
        provider.metatype,
      );
      const keys = this.metadataScanner.getAllMethodNames(
        provider.metatype.prototype,
      );

      for (const key of keys) {
        const resolverMeta = Reflect.getMetadata(
          RESOLVER_TYPE_METADATA,
          provider.metatype.prototype[key],
        );

        const isQueryMutationOrSubscription = [
          'Query',
          'Mutation',
          'Subscription',
        ].includes(resolverMeta);
        if (
          isGraphQlResolver &&
          isQueryMutationOrSubscription &&
          !this.isAffected(provider.metatype.prototype[key])
        ) {
          const traceName = `${provider.name}.${provider.metatype.prototype[key].name}`;

          provider.metatype.prototype[key] = this.wrap(
            provider.metatype.prototype[key],
            traceName,
            {
              'nestjs.type': 'graphql_resolver',
              'nestjs.provider': provider.name,
              'nestjs.resolver': String(resolverMeta).toLowerCase(),
              'nestjs.callback': provider.metatype.prototype[key].name,
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
}
