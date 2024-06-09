class PubSubChannelWriter {
  public getPublishMessage(channelName: string, message: string): string {
    return createArray([
      createBulkString("message"),
      createBulkString(channelName),
      createBulkString(message),
    ]);
  }

  public getSubscribeMessage(
    channelName: string,
    numberOfSubscriptions: number,
  ): string {
    return this.getPubSubStateChangeMessage(
      "subscribe",
      channelName,
      numberOfSubscriptions,
    );
  }

  public getUnsubscribeMessage(
    channelName: string,
    numberOfSubscriptions: number,
  ): string {
    return this.getPubSubStateChangeMessage(
      "unsubscribe",
      channelName,
      numberOfSubscriptions,
    );
  }

  private getPubSubStateChangeMessage(
    newState: "subscribe" | "unsubscribe",
    channel: string,
    numberOfSubscriptions: number,
  ): string {
    return createArray([
      createBulkString(newState),
      createBulkString(channel),
      createInteger(numberOfSubscriptions),
    ]);
  }
}

class PubSubPatternWriter {
  public getPublishMessage(
    pattern: RegExp,
    channel: string,
    message: string,
  ): string {
    return createArray([
      createBulkString("pmessage"),
      createBulkString(pattern.source),
      createBulkString(channel),
      createBulkString(message),
    ]);
  }

  public getSubscribeMessage(
    pattern: RegExp,
    numberOfSubscriptions: number,
  ): string {
    return this.getPubSubStateChangeMessage(
      "psubscribe",
      pattern.source,
      numberOfSubscriptions,
    );
  }

  getUnsubscribeMessage(
    pattern: RegExp,
    numberOfSubscriptions: number,
  ): string {
    return this.getPubSubStateChangeMessage(
      "punsubscribe",
      pattern.source,
      numberOfSubscriptions,
    );
  }

  private getPubSubStateChangeMessage(
    newState: "psubscribe" | "punsubscribe",
    channel: string,
    numberOfSubscriptions: number,
  ): string {
    return createArray([
      createBulkString(newState),
      createBulkString(channel),
      createInteger(numberOfSubscriptions),
    ]);
  }
}

const channelWriter: PubSubChannelWriter = new PubSubChannelWriter();
const patternWriter: PubSubPatternWriter = new PubSubPatternWriter();
export { channelWriter, patternWriter };
