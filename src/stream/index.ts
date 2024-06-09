export interface ISubscriber {
  notify(message: string, source?: string): void;
}

export interface INotifier {
  subscribe(sub: ISubscriber): void;
  unsubscribe(sub: ISubscriber): void;
}
