import { EVENTS } from '../../../../events/events';
import { eventEmitter } from '../../../../server';
import { UpdateSyncDto } from '../dto/update-sync.dto';
import { ISyncRepository } from '../sync.repository';

export interface UpdateSyncUseCase {
  execute(dto: UpdateSyncDto): Promise<void>;
}

export class UpdateSync implements UpdateSyncUseCase {
  constructor(private readonly repository: ISyncRepository) {}

  async execute(dto: UpdateSyncDto) {
    await this.repository.updateSync(dto);
    eventEmitter.emit(EVENTS.SYNC_UPDATED);
  }
}
