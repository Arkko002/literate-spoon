import { Socket } from "net";
import { CommandEvent } from "./commands/handler";
import { encodeClientCommandArray } from "./commands/resp";
import { warn } from "console";

export class EventLoop {
  private stop: boolean;
  private events: LoopEvent<any>[];
  private processed: LoopEvent<any>[];

  constructor() {
    this.events = [];
    this.processed = [];
    this.stop = false;
  }

  public addEvent(event: LoopEvent<any>) {
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
          await event.handler(event.object);
        } else {
          event.handler(event.object);
        }

        this.processed.push(event);
      }

      //NOTE: sleep for 1s for debug, need an alternative method of not swamping CPU in a loop
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  public stopProcessingLoop() {
    this.stop = true;
  }
}

// TODO: Is this useful in our implementation? (I.E. one not based on file descriptors / streams)
// TODO: Most likely will be handled by std abstractions for sockets, files and memory
export enum EventType {
  READ = 1,
  WRITE = 2,
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
