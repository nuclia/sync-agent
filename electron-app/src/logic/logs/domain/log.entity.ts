export enum LogSeverityLevel {
  low = 'low',
  medium = 'medium',
  high = 'high',
}

export interface LogEntityOptions {
  level: LogSeverityLevel;
  message: string;
  origin: string;
  createdAt?: Date;
  action: string;
  payload?: { [key: string]: unknown };
}

export class LogEntity {
  public level: LogSeverityLevel;
  public message: string;
  public createdAt: Date;
  public origin: string;
  public action: string;
  public payload: { [key: string]: unknown };

  constructor(options: LogEntityOptions) {
    const { message, level, origin, createdAt = new Date(), action, payload } = options;
    this.message = message;
    this.level = level;
    this.createdAt = createdAt;
    this.origin = origin;
    this.action = action;
    this.payload = payload || {};
  }

  static fromJson = (json: string): LogEntity => {
    json = json === '' ? '{}' : json;
    const { message, level, createdAt, origin, action, payload } = JSON.parse(json);
    const log = new LogEntity({
      message,
      level,
      createdAt: new Date(createdAt),
      origin,
      action,
      payload,
    });
    return log;
  };
}
