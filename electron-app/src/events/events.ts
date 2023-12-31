export enum EVENTS {
  START_LISTENING = 'start-listening',
  STOP_LISTENING = 'stop-listening',
  SYNC_CREATED = 'sync-created',
  SYNC_UPDATED = 'sync-updated',
  SYNC_DELETED = 'sync-deleted',
  START_SYNCHRONIZATION_SYNC_OBJECT = 'start-synchronization-sync-object',
  FINISH_SYNCHRONIZATION_SYNC_OBJECT = 'finish-synchronization-sync-object',
  FINISH_SYNCHRONIZATION_SINGLE_FILE = 'finish-synchronization-single-file',
}

export type EVENTS_TYPE = (typeof EVENTS)[keyof typeof EVENTS];

export class EventEmitter {
  private events: { [name: string]: Function[] } = {};

  // Subscribe to an event
  public subscribe(eventName: EVENTS_TYPE, fn: Function): void {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }

    this.events[eventName].push(fn);
  }

  // Unsubscribe from an event
  public unSubscribe(eventName: EVENTS_TYPE, fn: Function): void {
    if (this.events[eventName]) {
      this.events[eventName] = this.events[eventName].filter((eventFn) => fn !== eventFn);
    }
  }

  // Emit an event
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public emit(eventName: EVENTS_TYPE, data?: any): void {
    const event = this.events[eventName];
    if (event) {
      event.forEach((fn) => {
        fn.call(null, data);
      });
    }
  }
}
