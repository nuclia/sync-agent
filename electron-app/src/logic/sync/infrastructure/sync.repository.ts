import { ISyncDatasource } from '../domain/sync.datasource';
import { SyncEntity } from '../domain/sync.entity';
import { ISyncRepository } from '../domain/sync.repository';

export class SyncRepository implements ISyncRepository {
  constructor(private readonly syncDatasource: ISyncDatasource) {}

  async getAllSync() {
    return this.syncDatasource.getAllSync();
  }

  async getSync(id: string) {
    return this.syncDatasource.getSync(id);
  }

  async createSync(sync: SyncEntity) {
    return this.syncDatasource.createSync(sync);
  }

  async deleteSync(id: string) {
    return this.syncDatasource.deleteSync(id);
  }

  async updateSync(id: string, sync: SyncEntity) {
    return this.syncDatasource.updateSync(id, sync);
  }
}
