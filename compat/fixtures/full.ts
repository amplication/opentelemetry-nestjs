// Compatibility fixture: every instrumentation, with all optional peers installed.
// Run via compat/run.sh against the packed package - not part of the build.
import 'reflect-metadata';
import { readFileSync } from 'fs';
import {
  CanActivate,
  Controller,
  Get,
  Injectable,
  Module,
  UseGuards,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Query, Resolver } from '@nestjs/graphql';
import { MessagePattern } from '@nestjs/microservices';
import { Cron } from '@nestjs/schedule';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ControllerInstrumentation,
  EventEmitterInstrumentation,
  GraphQLResolverInstrumentation,
  GuardInstrumentation,
  InterceptorInstrumentation,
  OpenTelemetryModule,
  PipeInstrumentation,
  ScheduleInstrumentation,
  Traceable,
} from '@amplication/opentelemetry-nestjs';

@Injectable()
class AllowGuard implements CanActivate {
  canActivate() {
    return true;
  }
}

@Controller('fixture')
class FixtureController {
  @Get()
  @UseGuards(AllowGuard)
  http() {
    return 'http';
  }

  @MessagePattern('fixture')
  message() {
    return 'message';
  }
}

@Resolver()
class FixtureResolver {
  @Query(() => String)
  query() {
    return 'query';
  }
}

@Injectable()
class FixtureJobs {
  @Cron('0 0 1 1 *')
  cron() {}

  @OnEvent('fixture')
  event() {}
}

@Injectable()
@Traceable()
class FixtureService {
  work() {
    return 'work';
  }
}

const methods = () => ({
  controller: FixtureController.prototype.http,
  microservice: FixtureController.prototype.message,
  resolver: FixtureResolver.prototype.query,
  schedule: FixtureJobs.prototype.cron,
  eventEmitter: FixtureJobs.prototype.event,
  traceable: FixtureService.prototype.work,
});

const before = methods();

@Module({
  imports: [
    OpenTelemetryModule.forRoot({
      instrumentation: [
        ControllerInstrumentation,
        GraphQLResolverInstrumentation,
        GuardInstrumentation,
        EventEmitterInstrumentation,
        ScheduleInstrumentation,
        PipeInstrumentation,
        InterceptorInstrumentation,
      ],
    }),
  ],
  controllers: [FixtureController],
  providers: [FixtureResolver, FixtureJobs, FixtureService, AllowGuard],
})
class AppModule {}

const version = (pkg: string) =>
  JSON.parse(readFileSync(`node_modules/${pkg}/package.json`, 'utf8')).version;

(async () => {
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.init();
  const after = methods();
  await app.close();

  console.log(
    `@nestjs/core ${version('@nestjs/core')}, @nestjs/graphql ${version('@nestjs/graphql')}`,
  );
  const unwrapped = Object.keys(before).filter(
    (key) => before[key] === after[key],
  );
  if (unwrapped.length) {
    console.error(`Not instrumented: ${unwrapped.join(', ')}`);
    process.exit(1);
  }
  console.log(`Instrumented: ${Object.keys(before).join(', ')}`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
