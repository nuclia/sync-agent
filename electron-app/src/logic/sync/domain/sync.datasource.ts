import { SyncEntity } from './sync.entity';

export abstract class ISyncDatasource {
  abstract createSync(sync: SyncEntity): Promise<void>;
  abstract getAllSync(): Promise<{ [id: string]: SyncEntity }>;
  abstract getSync(id: string): Promise<SyncEntity | null>;
  abstract deleteSync(id: string): Promise<void>;
  abstract updateSync(id: string, sync: SyncEntity): Promise<void>;
}
