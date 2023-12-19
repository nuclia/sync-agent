import { EVENTS } from './events/events';
import { LogEntity, LogSeverityLevel } from './logic/logs/domain/log.entity';
import { SaveLogs } from './logic/logs/domain/use-cases/save-logs.use-case';
import { FileSystemLogDatasource } from './logic/logs/infrastructure/file-system.log.datasource';
import { LogRepository } from './logic/logs/infrastructure/log.repository';
import { eventEmitter } from './server';

export function initFileSystemSubscribers(basePath: string) {
  eventEmitter.subscribe(EVENTS.SYNC_CREATED, (values: { [key: string]: unknown }) => {
    const saveLog = new SaveLogs(new LogRepository(new FileSystemLogDatasource(basePath)));
    saveLog.execute(
      new LogEntity({
        message: 'Sync created',
        level: LogSeverityLevel.low,
        origin: 'electron-app',
        action: EVENTS.SYNC_CREATED,
        payload: values,
      }),
    );
  });

  eventEmitter.subscribe(EVENTS.SYNC_UPDATED, (values: { [key: string]: unknown }) => {
    const saveLog = new SaveLogs(new LogRepository(new FileSystemLogDatasource(basePath)));
    saveLog.execute(
      new LogEntity({
        message: 'Sync updated',
        level: LogSeverityLevel.low,
        origin: 'electron-app',
        action: EVENTS.SYNC_UPDATED,
        payload: values,
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
        action: EVENTS.SYNC_DELETED,
      }),
    );
  });

  eventEmitter.subscribe(EVENTS.START_SYNCHRONIZATION_SYNC_OBJECT, (payload: { [key: string]: string }) => {
    const saveLog = new SaveLogs(new LogRepository(new FileSystemLogDatasource(basePath)));
    saveLog.execute(
      new LogEntity({
        message: 'Synchronization started',
        level: LogSeverityLevel.low,
        origin: 'electron-app',
        action: EVENTS.START_SYNCHRONIZATION_SYNC_OBJECT,
        payload,
      }),
    );
  });
  eventEmitter.subscribe(EVENTS.FINISH_SYNCHRONIZATION_SYNC_OBJECT, (payload: { [key: string]: string }) => {
    const saveLog = new SaveLogs(new LogRepository(new FileSystemLogDatasource(basePath)));
    saveLog.execute(
      new LogEntity({
        message: 'Synchronization finished',
        level: LogSeverityLevel.low,
        origin: 'electron-app',
        action: EVENTS.FINISH_SYNCHRONIZATION_SYNC_OBJECT,
        payload,
      }),
    );
  });
  eventEmitter.subscribe(EVENTS.FINISH_SYNCHRONIZATION_SINGLE_FILE, (payload: { [key: string]: string }) => {
    const saveLog = new SaveLogs(new LogRepository(new FileSystemLogDatasource(basePath)));
    saveLog.execute(
      new LogEntity({
        message: 'Synchronization single file finished',
        level: LogSeverityLevel.low,
        origin: 'electron-app',
        action: EVENTS.FINISH_SYNCHRONIZATION_SINGLE_FILE,
        payload,
      }),
    );
  });
}
