import { pathExists, readFile, writeFile } from '../../../fileSystemFn';
import { ISyncDatasource } from '../domain/sync.datasource';
import { SyncEntity } from '../domain/sync.entity';

export class FileSystemSyncDatasource implements ISyncDatasource {
  private basePath: string;
  private allSyncData: { [id: string]: SyncEntity };

  constructor(basePath: string) {
    this.basePath = `${basePath}/sync.json`;
    this.allSyncData = {};
  }
  private loadSyncData = async () => {
    this.allSyncData = JSON.parse(await readFile(this.basePath));
  };

  private createSyncFile = async () => {
    if (await pathExists(this.basePath)) {
      await writeFile(this.basePath, JSON.stringify({}, null, 2));
    }
  };

  async createSync(newSync: SyncEntity): Promise<void> {
    await this.loadSyncData();
    console.log('newSync', newSync);
    this.allSyncData[newSync.id] = newSync;

    await this.createSyncFile();
    await writeFile(this.basePath, JSON.stringify(this.allSyncData, null, 2));
  }

  async getAllSync(): Promise<{ [id: string]: SyncEntity }> {
    await this.loadSyncData();
    const result: { [id: string]: SyncEntity } = {};
    for (const key in this.allSyncData) {
      result[key] = new SyncEntity(this.allSyncData[key]);
    }
    return result;
  }

  async getSync(id: string): Promise<SyncEntity | null> {
    await this.loadSyncData();
    if (id in this.allSyncData) {
      return new SyncEntity(this.allSyncData[id]);
    }
    return null;
  }

  async deleteSync(id: string): Promise<void> {
    await this.loadSyncData();
    delete this.allSyncData[id];
    await writeFile(this.basePath, JSON.stringify(this.allSyncData, null, 2));
  }

  async updateSync(id: string, sync: SyncEntity): Promise<void> {
    await this.loadSyncData();
    this.allSyncData[id] = sync;
    await writeFile(this.basePath, JSON.stringify(this.allSyncData, null, 2));
  }
}
