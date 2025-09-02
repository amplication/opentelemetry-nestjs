import { Tracer as OTelTracer } from '@opentelemetry/api';

// The `Tracer` isn't exported as a class anymore, so we merge the interface
// declaration with a dummy class so that we can use it as an injection token.

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class Tracer {}
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface Tracer extends OTelTracer {}
