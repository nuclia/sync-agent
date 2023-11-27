import { EVENTS } from './events/events';
import { LogEntity, LogSeverityLevel } from './logic/logs/domain/log.entity';
import { SaveLogs } from './logic/logs/domain/use-cases/save-logs.use-case';
import { FileSystemLogDatasource } from './logic/logs/infrastructure/file-system.log.datasource';
import { LogRepository } from './logic/logs/infrastructure/log.repository';
import { eventEmitter } from './server';

export function initFileSystemSubscribers(basePath: string) {
  eventEmitter.subscribe(EVENTS.SYNC_CREATED, () => {
    const saveLog = new SaveLogs(new LogRepository(new FileSystemLogDatasource(basePath)));
    saveLog.execute(
      new LogEntity({
        message: 'Sync created',
        level: LogSeverityLevel.low,
        origin: 'electron-app',
      }),
    );
  });

  eventEmitter.subscribe(EVENTS.SYNC_UPDATED, () => {
    const saveLog = new SaveLogs(new LogRepository(new FileSystemLogDatasource(basePath)));
    saveLog.execute(
      new LogEntity({
        message: 'Sync updated',
        level: LogSeverityLevel.low,
        origin: 'electron-app',
      }),
    );
  });

  eventEmitter.subscribe(EVENTS.SYNC_DELETED, () => {
    const saveLog = new SaveLogs(new LogRepository(new FileSystemLogDatasource(basePath)));
    saveLog.execute(
      new LogEntity({
        message: 'Sync deleted',
        level: LogSeverityLevel.low,
        origin: 'electron-app',
      }),
    );
  });
}
