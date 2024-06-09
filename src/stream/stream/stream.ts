import { INotifier, ISubscriber } from "..";
import { Result, RedosError, Ok, Err } from "../../error-handling";
import { StreamErrorKind } from "./stream.error";
import { EntryNode, EntryTree } from "./tree";

// NOTE: https://redis.io/docs/latest/develop/data-types/streams/
// TODO: Adding entry should be O(1), lookup should be O(n) where n is length of ID, IDs with constant length make lookup O(1) (radix tree)
// TODO: Consumption strategies
class StreamManager {
  private streams: Map<string, Stream>;

  private static MAX_SEQUENCE_NUMBER: number = Number.MAX_VALUE;
  private static MIN_SEQUENCE_NUMBER: number = 0;

  public constructor() {
    this.streams = new Map();
  }

  public addEntry(
    streamKey: string,
    fields: Map<string, any>,
    noMakeStream: boolean,
  ): Result<string, RedosError> {
    const stream: Stream | undefined = this.streams.get(streamKey);
    if (stream) {
      return Ok(stream.addEntry(fields));
    }

    if (!noMakeStream) {
      const newStream = new Stream(streamKey);
      const id: string = newStream.addEntry(fields);
      this.streams.set(streamKey, newStream);

      return Ok(id);
    }

    // TODO: Should it error with noMakeStream?
    return Ok("");
  }

  // TODO: Three access modes in one stream through different commands:
  // 1. follow with fan out to following clients (pubsub style?)
  // 2. time series store, appending of new messages, but also ranges of time, and iterative cursor over all history
  // 3. consumer groups
  public readEntries(
    streamKey: string,
    lastId: string,
    count?: number,
    blockForMs?: number,
  ): Result<StreamEntry[], RedosError> {
    // TODO: Reading multiple streams at once with (streamKey, lastId) tuples
    // TODO: Blocking reading

    const stream: Stream | undefined = this.streams.get(streamKey);
    if (!stream) {
      return Err(
        new RedosError(
          `Cannot find stream ${streamKey}`,
          StreamErrorKind.STREAM_NOT_FOUND,
        ),
      );
    }

    stream.read();
  }

  // TODO: XREVRANGE support: https://redis.io/docs/latest/commands/xrevrange/
  public readRange(start: string, end: string, count?: number): StreamEntry[] {
    let startRange: string = start.includes("-")
      ? start
      : `${start}-${StreamManager.MIN_SEQUENCE_NUMBER}`;
    let endRange: string = end.includes("-")
      ? end
      : `${end}-${StreamManager.MAX_SEQUENCE_NUMBER}`;
  }

  // NOTE: https://redis.io/docs/latest/commands/xlen/
  public getStreamLength(streamKey: string): number {
    const stream: Stream | undefined = this.streams.get(streamKey);
    if (stream) {
      return stream.length();
    }

    return 0;
  }
}

// TODO: https://redis.io/docs/latest/develop/data-types/streams/#listening-for-new-items-with-xread
class Stream implements INotifier {
  public name: string;
  private entries: EntryTree;
  private sequenceNumber: number = 1;

  private maxLen: number = 0;
  private minId: number = 0;

  public constructor(name: string) {
    this.name = name;
    this.entries = new EntryTree("");
  }

  public subscribe(sub: ISubscriber): void {
    throw new Error("Method not implemented.");
  }

  public unsubscribe(sub: ISubscriber): void {
    throw new Error("Method not implemented.");
  }

  public addEntry(fields: Map<string, any>, id?: string): string {
    const entryId = id ? id : this.generateId();
    const entry = new StreamEntry(entryId, fields);
    // TODO: Insert entry instead of ID when done debugging
    this.entries.insert(entryId);

    if (this.maxLen || this.minId) {
      this.trimEntries();
    }

    return entryId;
  }

  public readFrom(id: string, count?: number) {
    let entry: Result<EntryNode, RedosError> = this.entries.lookup(id);
  }

  public length(): number {
    return this.entries.elements;
  }

  public setTrimmingStrategy(
    maxLen?: number,
    minId?: number,
  ): Result<null, RedosError> {
    if (maxLen && minId) {
      return Err(
        new RedosError(
          `Cannot set both MINID and MAXLEN strem caps at once`,
          StreamErrorKind.INCORRECT_TRIMMING_STRATEGY,
        ),
      );
    }

    if (maxLen && maxLen > 0) {
      this.maxLen = maxLen;
    }

    if (minId && minId > 0) {
      this.minId = minId;
    }

    return Ok(null);
  }

  public clearTrimmingStrategy(): void {
    this.minId = 0;
    this.maxLen = 0;
  }

  private trimEntries(): void {
    // TODO:
    // MAXLEN: Evicts entries as long as the stream's length exceeds the specified threshold, where threshold is a positive integer.
    // MINID: Evicts entries with IDs lower than threshold, where threshold is a stream ID.
    // By default, or when provided with the optional = argument, the command performs exact trimming.
    // Depending on the strategy, exact trimming means:
    // MAXLEN: the trimmed stream's length will be exactly the minimum between its original length and the specified threshold.
    // MINID: the oldest ID in the stream will be exactly the maximum between its original oldest ID and the specified threshold.
    // TODO: Nearly exact trimming
  }

  // TODO: the minimum valid ID is 0-1
  // user must specify an ID which is greater than any other ID currently inside the stream
  private generateId(unixTime?: number): string {
    return `${unixTime ? unixTime : Date.now()}-${this.sequenceNumber++}}`;
  }
}

class StreamEntry {
  private id: string;
  // NOTE: Map remembers the original insertion order, validate it higher
  private fields: Map<string, any>;

  public constructor(id: string, fields: Map<string, any>) {
    this.id = id;
    this.fields = fields;
  }
}
