import { CreateSyncDto } from './dto/create-sync.dto';
import { UpdateSyncDto } from './dto/update-sync.dto';
import { ISyncEntity } from './sync.entity';

export abstract class ISyncDatasource {
  abstract createSync(dto: CreateSyncDto): Promise<void>;
  abstract getAllSync(): Promise<{ [id: string]: ISyncEntity }>;
  abstract getSync(id: string): Promise<ISyncEntity | null>;
  abstract deleteSync(id: string): Promise<void>;
  abstract updateSync(dto: UpdateSyncDto): Promise<void>;
}
