export interface IEventLoop {
  addEvent(event: LoopEvent<any>): void;
  startProcessingLoop(): void;
  stopProcessingLoop(): void;
}

// TODO: 1. Start with blocking operations

// TODO: Implement all queues and maintanance tasks
// https://github.com/redis/redis/blob/unstable/src/ae.c#L342
// TODO: Implement timed events: https://redis.io/docs/latest/operate/oss_and_stack/reference/internals/internals-rediseventlib/
export class EventLoop implements IEventLoop {
  private stop: boolean;
  private events: LoopEvent<any>[];

  constructor() {
    this.events = [];
    this.stop = false;
  }

  public addEvent(event: LoopEvent<any>): void {
    this.events.push(event);
  }

  public startProcessingLoop(): void {
    if (this.stop) {
      this.stop = false;
    }

    while (!this.stop) {
      const event: LoopEvent<any> | undefined = this.events.shift();
      console.log(`EVENT: ${JSON.stringify(event)}`);

      if (event) {
        event.handler(event.object, this);
      } else {
        // TODO: Break mechanism for blocking task processing
        break;
      }
    }

    return;
  }

  public stopProcessingLoop(): void {
    this.stop = true;
  }

  private wait(ms: number): void {
    const start = Date.now();
    while (Date.now() - start < ms);
  }
}

export interface LoopEvent<T> {
  object: T;
  //TODO: Async handlers (optional)
  isAsync: boolean;
  handler: LoopEventHandler<T>;
}

export interface LoopEventHandler<T> {
  (data: T, eventLoop: IEventLoop): void;
}

export interface StopLoopEventHandler extends LoopEventHandler<EventLoop> {
  (eventLoop: EventLoop): void;
}

export const stopEventLoopHandler: StopLoopEventHandler = (
  eventLoop: EventLoop,
) => {
  console.log(`Event loop stopped`);
  eventLoop.stopProcessingLoop();
};
