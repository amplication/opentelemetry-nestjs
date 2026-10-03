// Compatibility fixture: the optional peers (@nestjs/graphql, @nestjs/microservices,
// @nestjs/schedule) are NOT installed - the module must still load and instrument.
// Run via compat/run.sh against the packed package - not part of the build.
import 'reflect-metadata';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { OpenTelemetryModule } from '@amplication/opentelemetry-nestjs';

@Controller('fixture')
class FixtureController {
  @Get()
  http() {
    return 'http';
  }
}

const before = FixtureController.prototype.http;

// forRoot() with no arguments registers every default instrumentation,
// including the graphql / schedule ones whose packages are absent.
@Module({
  imports: [OpenTelemetryModule.forRoot()],
  controllers: [FixtureController],
})
class AppModule {}

(async () => {
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.init();
  const after = FixtureController.prototype.http;
  await app.close();

  if (before === after) {
    console.error('Not instrumented: controller');
    process.exit(1);
  }
  console.log('Instrumented: controller (optional peers absent)');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
