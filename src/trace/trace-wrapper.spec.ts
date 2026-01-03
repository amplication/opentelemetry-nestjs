/* eslint-disable no-console */
import { TraceWrapper } from './trace-wrapper';
import { ILogger } from './logger.interface';

import 'reflect-metadata';

export const MockedLogger: ILogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

class TestClass {
  testMethod(): void {
    console.log('test');
  }

  async testMethodAsync(
    startMessage: string,
    endMessage: string,
  ): Promise<string> {
    console.log(startMessage);
    await new Promise((resolve) => setTimeout(resolve, 1));
    console.log(endMessage);

    return 'testMethodAsync completed';
  }
}

jest.spyOn(console, 'log').mockImplementation(() => {
  return;
});
jest.spyOn(console, 'debug').mockImplementation(() => {
  return;
});

describe('TraceWrapper', () => {
  let instance: TestClass;
  let loggerMock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('trace', () => {
    beforeEach(() => {
      loggerMock = {
        debug: jest.fn(),
      };
    });

    it('should trace all methods in the class', () => {
      instance = new TestClass();

      const wrapSpy = jest.spyOn(TraceWrapper, 'wrap');
      const tracedInstance = TraceWrapper.trace(instance, loggerMock);

      expect(tracedInstance).toBe(instance);

      expect(wrapSpy).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ name: 'testMethod' }),
        'TestClass.testMethod',
        { class: 'TestClass', method: 'testMethod' },
      );
      expect(wrapSpy).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ name: 'testMethodAsync' }),
        'TestClass.testMethodAsync',
        expect.anything(),
      );

      expect(tracedInstance.testMethod).toBe(instance.testMethod);
      expect(tracedInstance.testMethodAsync).toBe(instance.testMethodAsync);
    });

    it('should use console as the default logger', () => {
      instance = new TestClass();

      jest.spyOn(TraceWrapper, 'wrap').mockReturnValue(instance.testMethod);
      const consoleSpy = jest.spyOn(console, 'debug');

      const tracedInstance = TraceWrapper.trace(instance);

      expect(tracedInstance).toBe(instance);

      expect(consoleSpy).toHaveBeenCalledWith('Mapped TestClass.testMethod', {
        class: 'TestClass',
        method: 'testMethod',
      });
    });

    it('should wrap an function transparently', async () => {
      const original = new TestClass();
      const wrapped = TraceWrapper.trace(original, {
        attributes: {},
        logger: MockedLogger,
      });

      const originalSyncResult = original.testMethod();
      const wrappedSyncResult = wrapped.testMethod();
      const originalAsyncResult = await original.testMethodAsync(
        'start',
        'end',
      );
      const wrappedAsyncResult = await wrapped.testMethodAsync('start', 'end');

      expect(originalSyncResult).toStrictEqual(wrappedSyncResult);
      expect(originalAsyncResult).toBe(wrappedAsyncResult);
    });
  });
});
