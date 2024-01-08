import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { ModulesContainer } from '@nestjs/core';
import { Controller, Injectable } from '@nestjs/common/interfaces';
import { SpanKind } from '@opentelemetry/api';
import { MetadataScanner } from '../../MetaScanner';
export declare class BaseTraceInjector {
    protected readonly modulesContainer: ModulesContainer;
    protected readonly metadataScanner: MetadataScanner;
    constructor(modulesContainer: ModulesContainer);
    protected getControllers(): Generator<InstanceWrapper<Controller>>;
    protected getProviders(): Generator<InstanceWrapper<Injectable>>;
    protected isPath(prototype: any): boolean;
    protected isMicroservice(prototype: any): boolean;
    protected isAffected(prototype: any): boolean;
    protected getTraceName(prototype: any): string;
    protected isDecorated(prototype: any): boolean;
    protected reDecorate(source: any, destination: any): void;
    protected wrap(prototype: Record<any, any>, traceName: any, attributes?: {}, spanKind?: SpanKind): Record<any, any>;
    protected affect(prototype: any): void;
}
