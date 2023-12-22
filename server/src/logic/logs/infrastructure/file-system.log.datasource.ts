import {
  appendFile,
  createDirectory,
  deleteFile,
  findFilesInDirectory,
  pathExists,
  readFile,
  writeFile,
} from '../../../fileSystemFn';
import { ILogDatasource } from '../domain/log.datasource';
import { LogEntity } from '../domain/log.entity';

export class FileSystemLogDatasource implements ILogDatasource {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = `${basePath}/logs`;
  }

  private createLogsFiles = async () => {
    if (await pathExists(this.basePath)) {
      await createDirectory(this.basePath);
    }

    const dateText = new Intl.DateTimeFormat('en-ca', { dateStyle: 'short' }).format(new Date());
    const fileName = `${this.basePath}/${dateText}.log`;
    if (!(await pathExists(`${this.basePath}/${dateText}.log`))) {
      await writeFile(`${this.basePath}/${dateText}.log`, '');
    }
    return fileName;
  };

  async saveLog(newLog: LogEntity): Promise<void> {
    const logAsJson = `${JSON.stringify(newLog)}\n`;
    const fileName = await this.createLogsFiles();
    await appendFile(fileName, logAsJson);
  }

  private getLogsFromFile = async (path: string): Promise<LogEntity[]> => {
    const content = await readFile(path);
    if (content === '') return [];

    const logs = content.split('\n').filter(Boolean).map(LogEntity.fromJson);
    return logs;
  };

  async getLogs(): Promise<LogEntity[]> {
    const files = await findFilesInDirectory(this.basePath, ['log']);
    const result = [];
    for (const file of files) {
      const logs = await this.getLogsFromFile(file);
      result.push(...logs);
    }
    return result;
  }

  async deleteLogs(): Promise<void> {
    const files = await findFilesInDirectory(this.basePath, ['log']);
    for (const file of files) {
      await deleteFile(file);
    }
  }
}
