import { EVENTS } from '../../../../events/events';
import { eventEmitter } from '../../../../server';
import { ISyncRepository } from '../sync.repository';

export interface DeleteSyncUseCase {
  execute(id: string): Promise<void>;
}

export class DeleteSync implements DeleteSyncUseCase {
  constructor(private readonly repository: ISyncRepository) {}

  async execute(id: string) {
    await this.repository.deleteSync(id);
    eventEmitter.emit(EVENTS.SYNC_DELETED);
  }
}
