import { Socket } from "net";

export interface IConnection {
  read(): Buffer | null;
  isClosed(): boolean;
  close(): void;
  // TODO: Accept buffer with RESP only
  write(output: Buffer | string): void;
}

export class Connection implements IConnection {
  public id: string;
  private socket: Socket;

  public constructor(socket: Socket, id: string) {
    this.id = id;
    this.socket = socket;
  }

  public read(): Buffer | null {
    return this.socket.read();
  }

  public isClosed(): boolean {
    return this.socket.closed;
  }

  public close(): void {
    this.socket.end();
  }

  public write(output: Buffer | string): void {
    this.socket.write(output);
  }
}
