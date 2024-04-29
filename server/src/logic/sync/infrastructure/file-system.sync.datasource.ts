import { pathExists, readFile, writeFile } from '../../../fileSystemFn';
import { CustomError } from '../../errors';
import { CreateSyncDto } from '../domain/dto/create-sync.dto';
import { UpdateSyncDto } from '../domain/dto/update-sync.dto';
import { ISyncDatasource } from '../domain/sync.datasource';
import { ISyncEntity } from '../domain/sync.entity';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PlainObject = Record<string, any>;

function isObject(item: unknown) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

function deepMerge<T extends PlainObject>(target: T, ...sources: PlainObject[]): T {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return deepMerge(target, ...sources);
}

export class FileSystemSyncDatasource implements ISyncDatasource {
  private basePath: string;
  private allSyncData: { [id: string]: ISyncEntity };

  constructor(basePath: string) {
    this.basePath = `${basePath}/sync.json`;
    this.allSyncData = {};
  }
  private loadSyncData = async () => {
    const data = await readFile(this.basePath);
    try {
      this.allSyncData = JSON.parse(data);
    } catch (e) {
      console.error(e);
    }
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
      throw new CustomError(`Create sync: Sync with id ${id} already exists`, 409);
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
      throw new CustomError(`Delete sync: Sync with id ${id} not found`, 404);
    }
    await this.loadSyncData();
    delete this.allSyncData[id];
    await writeFile(this.basePath, JSON.stringify(this.allSyncData, null, 2));
  }

  async updateSync(dto: UpdateSyncDto): Promise<void> {
    const { id, ...sync } = dto.values;
    const data = await this.getSync(id);
    if (data === null) {
      throw new CustomError(`Update sync: Sync with id ${id} not found`, 404);
    }
    // override filters (so missing values are removed)
    if (sync.filters) {
      data.filters = sync.filters;
    }
    const newSync = deepMerge(data, sync);
    await this.loadSyncData();
    this.allSyncData[id] = newSync;
    await writeFile(this.basePath, JSON.stringify(this.allSyncData, null, 2));
  }
}
