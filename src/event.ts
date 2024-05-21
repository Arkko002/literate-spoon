export interface IEventLoop {
  addEvent(event: LoopEvent<any>): void;
  startProcessingLoop(): Promise<void>;
  stopProcessingLoop(): void;
}

// TODO: Implement all queues and maintanance tasks
// https://github.com/redis/redis/blob/unstable/src/ae.c#L342
export class EventLoop implements IEventLoop {
  private stop: boolean;
  private events: LoopEvent<any>[];
  // TODO: Implement timed events: https://redis.io/docs/latest/operate/oss_and_stack/reference/internals/internals-rediseventlib/
  private _fired: LoopEvent<any>[];

  constructor() {
    this.events = [];
    this._fired = [];
    this.stop = false;
  }

  public addEvent(event: LoopEvent<any>): void {
    this.events.push(event);
  }

  public async startProcessingLoop(): Promise<void> {
    console.log("START PROCESSING LOOP");
    if (this.stop) {
      this.stop = false;
    }

    while (!this.stop) {
      const event: LoopEvent<any> | undefined = this.events.shift();
      console.log(`EVENT: ${JSON.stringify(event)}`);

      if (event) {
        if (event.isAsync) {
          // TODO: Implement async handlers
          event.handler(event.object);
        } else {
          event.handler(event.object);
        }
      }

      //NOTE: sleep for 1s for debug, need an alternative method of not swamping CPU in a loop
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  public stopProcessingLoop() {
    this.stop = true;
  }
}

export interface LoopEvent<T> {
  object: T;
  //TODO: Async handlers (optional)
  isAsync: boolean;
  handler: LoopEventHandler<T>;
}

export interface LoopEventHandler<T> {
  (data: T): void;
}

export interface StopEventLoopHandler extends LoopEventHandler<EventLoop> {
  (eventLoop: EventLoop): void;
}

export const stopEventLoopHandler: StopEventLoopHandler = (
  eventLoop: EventLoop,
) => {
  console.log(`Event loop stopped`);
  eventLoop.stopProcessingLoop();
};
