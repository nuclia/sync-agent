import { pathExists, readFile, writeFile } from '../../../fileSystemFn';
import { CustomError } from '../../errors';
import { CreateSyncDto } from '../domain/dto/create-sync.dto';
import { UpdateSyncDto } from '../domain/dto/update-sync.dto';
import { ISyncDatasource } from '../domain/sync.datasource';
import { ISyncEntity } from '../domain/sync.entity';

export class FileSystemSyncDatasource implements ISyncDatasource {
  private basePath: string;
  private allSyncData: { [id: string]: ISyncEntity };

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

  async createSync(dto: CreateSyncDto): Promise<void> {
    const { id } = dto.values;
    const data = await this.getSync(id);
    if (data !== null) {
      throw new CustomError(`Sync with id ${id} already exists`, 409);
    }

    await this.loadSyncData();
    this.allSyncData[id] = dto.values;
    await this.createSyncFile();
    await writeFile(this.basePath, JSON.stringify(this.allSyncData, null, 2));
  }

  async getAllSync(): Promise<{ [id: string]: ISyncEntity }> {
    await this.loadSyncData();
    return this.allSyncData;
  }

  async getSync(id: string): Promise<ISyncEntity | null> {
    await this.loadSyncData();
    if (id in this.allSyncData) {
      return this.allSyncData[id];
    }
    return null;
  }

  async deleteSync(id: string): Promise<void> {
    const data = await this.getSync(id);
    if (data === null) {
      throw new CustomError(`Sync with id ${id} not found`, 404);
    }
    await this.loadSyncData();
    delete this.allSyncData[id];
    await writeFile(this.basePath, JSON.stringify(this.allSyncData, null, 2));
  }

  async updateSync(dto: UpdateSyncDto): Promise<void> {
    const { id, ...sync } = dto.values;
    const data = await this.getSync(id);
    if (data === null) {
      throw new CustomError(`Sync with id ${id} not found`, 404);
    }
    const newSync = { ...data, ...sync };
    await this.loadSyncData();
    this.allSyncData[id] = newSync;
    await writeFile(this.basePath, JSON.stringify(this.allSyncData, null, 2));
  }
}
