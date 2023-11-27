import { CreateSyncDto } from '../domain/dto/create-sync.dto';
import { UpdateSyncDto } from '../domain/dto/update-sync.dto';
import { ISyncDatasource } from '../domain/sync.datasource';
import { ISyncRepository } from '../domain/sync.repository';

export class SyncRepository implements ISyncRepository {
  constructor(private readonly syncDatasource: ISyncDatasource) {}

  async getAllSync() {
    return this.syncDatasource.getAllSync();
  }

  async getSync(id: string) {
    return this.syncDatasource.getSync(id);
  }

  async createSync(dto: CreateSyncDto) {
    return this.syncDatasource.createSync(dto);
  }

  async deleteSync(id: string) {
    return this.syncDatasource.deleteSync(id);
  }

  async updateSync(dto: UpdateSyncDto) {
    return this.syncDatasource.updateSync(dto);
  }
}
