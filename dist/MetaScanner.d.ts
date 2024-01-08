import { Injectable } from '@nestjs/common/interfaces';
export declare class MetadataScanner {
    private readonly cachedScannedPrototypes;
    scanFromPrototype<T extends Injectable, R = any>(instance: T, prototype: object, callback: (name: string) => R): R[];
    getAllFilteredMethodNames(prototype: object): IterableIterator<string>;
    getAllMethodNames(prototype: object | null): string[];
}
