"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphQLResolverInjector = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const graphql_constants_1 = require("@nestjs/graphql/dist/graphql.constants");
const BaseTraceInjector_1 = require("./BaseTraceInjector");
let GraphQLResolverInjector = class GraphQLResolverInjector extends BaseTraceInjector_1.BaseTraceInjector {
    modulesContainer;
    loggerService = new common_1.Logger();
    constructor(modulesContainer) {
        super(modulesContainer);
        this.modulesContainer = modulesContainer;
    }
    inject() {
        const providers = this.getProviders();
        for (const provider of providers) {
            const isGraphQlResolver = Reflect.hasMetadata(graphql_constants_1.RESOLVER_NAME_METADATA, provider.metatype);
            const keys = this.metadataScanner.getAllMethodNames(provider.metatype.prototype);
            for (const key of keys) {
                const resolverMeta = Reflect.getMetadata(graphql_constants_1.RESOLVER_TYPE_METADATA, provider.metatype.prototype[key]);
                const isQueryMutationOrSubscription = [
                    'Query',
                    'Mutation',
                    'Subscription',
                ].includes(resolverMeta);
                if (isGraphQlResolver &&
                    isQueryMutationOrSubscription &&
                    !this.isAffected(provider.metatype.prototype[key])) {
                    const traceName = `Resolver->${provider.name}.${provider.metatype.prototype[key].name}`;
                    provider.metatype.prototype[key] = this.wrap(provider.metatype.prototype[key], traceName);
                    this.loggerService.log(`Mapped ${provider.name}.${key}`, this.constructor.name);
                }
            }
        }
    }
};
exports.GraphQLResolverInjector = GraphQLResolverInjector;
exports.GraphQLResolverInjector = GraphQLResolverInjector = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.ModulesContainer])
], GraphQLResolverInjector);
//# sourceMappingURL=GraphQLResolverInjector.js.map