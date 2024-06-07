import { Err, Ok, RedosError, Result } from "../error-handling";
import { Connection } from "../server/connection";
import { PubSubErrorKind } from "./pubsub.error";
import { patternWriter, channelWriter } from "./pubsub.writer";

export enum SubscribeType {
  CHANNEL,
  PATTERN,
}

export interface IPubSubManager {
  publish(channelName: string, message: string): void;
  subscribe(
    name: string,
    connection: Connection,
    subscribe: SubscribeType,
  ): Result<null, RedosError>;
  unsubscribe(
    name: string,
    connection: Connection,
    subscribe: SubscribeType,
  ): Result<null, RedosError>;
}

export interface ISubscriber {
  notify(message: string, source?: string): void;
}

export interface INotifier {
  subscribe(sub: ISubscriber): void;
  unsubscribe(sub: ISubscriber): void;
}

export interface IPublishable {
  publish(message: string): void;
}

// NOTE: https://github.com/redis/redis/blob/unstable/src/pubsub.c#L37
// NOTE: https://redis.io/docs/latest/develop/interact/pubsub/
class PubSubManager implements IPubSubManager {
  private static _instance: PubSubManager;

  private channels: Map<ChannelName, Channel> = new Map();
  // TODO: Custom RegExp class up to PPUBLISH pattern spec
  private patterns: Map<RegExp, PatternSubscription> = new Map();

  private constructor() {}

  public static get Instance(): PubSubManager {
    return this._instance || (this._instance = new PubSubManager());
  }

  public publish(channelName: string, message: string): void {
    let channel: Channel = this.getOrCreateChannel(channelName);
    channel.publish(message);
  }

  public subscribe(
    channelName: string,
    conn: Connection,
    subscribe: SubscribeType,
  ): Result<null, RedosError> {
    switch (subscribe) {
      case SubscribeType.CHANNEL: {
        return this.subscribeChannel(channelName, conn);
      }
      case SubscribeType.PATTERN: {
        return this.subscribePattern(new RegExp(channelName), conn);
      }
    }
  }

  private subscribeChannel(
    channelName: string,
    conn: Connection,
  ): Result<null, RedosError> {
    let channel: Channel = this.getOrCreateChannel(channelName);
    channel.subscribe(conn);

    const numberOfSubscriptions: number = conn.addChannelSubscription(
      channel.name,
    );

    const subscriptionMessage: string = channelWriter.getSubscribeMessage(
      channelName,
      numberOfSubscriptions,
    );

    conn.notify(subscriptionMessage, channel.name);

    return Ok(null);
  }

  private subscribePattern(
    pattern: RegExp,
    conn: Connection,
  ): Result<null, RedosError> {
    const patternSubscription: PatternSubscription | undefined =
      this.patterns.get(pattern);

    if (!patternSubscription) {
      const newPatternSubscription: PatternSubscription =
        new PatternSubscription(pattern);

      newPatternSubscription.subscribe(conn);

      this.channels.forEach((channel: Channel, channelName: ChannelName) => {
        if (pattern.test(channelName)) {
          channel.subscribe(newPatternSubscription);
        }
      });

      this.patterns.set(pattern, newPatternSubscription);

      return Ok(null);
    }

    patternSubscription.subscribe(conn);

    return Ok(null);
  }

  // TODO: Should removing last sub lead to channel and/or pattern deletion?
  public unsubscribe(
    channelName: string,
    conn: Connection,
    subscribe: SubscribeType,
  ): Result<null, RedosError> {
    switch (subscribe) {
      case SubscribeType.CHANNEL: {
        return this.unsubscribeChannel(channelName, conn);
      }
      case SubscribeType.PATTERN: {
        return this.unsubscribePattern(new RegExp(channelName), conn);
      }
    }
  }

  private unsubscribeChannel(
    channelName: string,
    conn: Connection,
  ): Result<null, RedosError> {
    const channel: Channel | undefined = this.channels.get(channelName);
    if (!channel) {
      return Err(
        new RedosError(
          `Channel not found: ${channelName}`,
          PubSubErrorKind.CHANNEL_NOT_FOUND,
        ),
      );
    }

    channel.unsubscribe(conn);
    const numberOfSubscriptions: number = conn.removeChannelSubscription(
      channel.name,
    );

    const unsubscribeMessage: string = channelWriter.getUnsubscribeMessage(
      channel.name,
      numberOfSubscriptions,
    );

    conn.scheduleOutput(unsubscribeMessage);

    return Ok(null);
  }

  private unsubscribePattern(
    pattern: RegExp,
    conn: Connection,
  ): Result<null, RedosError> {
    const patternSubscription: PatternSubscription | undefined =
      this.patterns.get(pattern);

    if (!patternSubscription) {
      return Err(
        new RedosError(
          `Cannot find pattern: ${pattern}`,
          PubSubErrorKind.PATTERN_NOT_FOUND,
        ),
      );
    }

    patternSubscription.unsubscribe(conn);

    return Ok(null);
  }

  private getOrCreateChannel(channelName: string): Channel {
    let channel: Channel | undefined = this.channels.get(channelName);

    if (!channel) {
      channel = new Channel(channelName);
      this.channels.set(channelName, channel);
      this.subscribePatternsToChannel(channel);
    }

    return channel;
  }

  private subscribePatternsToChannel(channel: Channel): void {
    this.patterns.forEach((pattern: PatternSubscription, key: RegExp) => {
      if (key.test(channel.name)) {
        channel.subscribe(pattern);
      }
    });
  }
}

export type ChannelName = string;

class Channel implements INotifier, IPublishable {
  public name: ChannelName;
  private subscribers: ISubscriber[];

  public constructor(channel: string) {
    this.name = channel;
    this.subscribers = [];
  }

  public subscribe(subscriber: ISubscriber): void {
    this.subscribers.push(subscriber);
  }

  public unsubscribe(subscriber: ISubscriber): void {
    this.subscribers = this.subscribers.filter(
      (conn: ISubscriber): boolean => conn !== subscriber,
    );
  }

  public publish(message: string): void {
    const publishMessage: string = channelWriter.getPublishMessage(
      this.name,
      message,
    );

    for (const conn of this.subscribers) {
      conn.notify(publishMessage);
    }
  }
}

class PatternSubscription implements INotifier, ISubscriber {
  public pattern: RegExp;
  private subscribers: ISubscriber[];

  public constructor(pattern: RegExp) {
    this.pattern = pattern;
    this.subscribers = [];
  }

  public notify(message: string, source: string): void {
    const publishMessage: string = patternWriter.getPublishMessage(
      this.pattern,
      source,
      message,
    );

    for (const sub of this.subscribers) {
      sub.notify(publishMessage);
    }
  }

  public subscribe(subscriber: ISubscriber): void {
    this.subscribers.push(subscriber);
  }

  public unsubscribe(subscriber: ISubscriber): void {
    this.subscribers = this.subscribers.filter(
      (conn: ISubscriber): boolean => conn !== subscriber,
    );
  }
}

const pubSubManager: PubSubManager = PubSubManager.Instance;
export { pubSubManager };
