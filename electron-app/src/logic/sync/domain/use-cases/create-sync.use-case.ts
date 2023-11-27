import { CreateSyncDto } from '../dto/create-sync.dto';
import { ISyncRepository } from '../sync.repository';

export interface CreateSyncUseCase {
  execute(dto: CreateSyncDto): Promise<void>;
}

export class CreateSync implements CreateSyncUseCase {
  constructor(private readonly repository: ISyncRepository) {}

  async execute(dto: CreateSyncDto): Promise<void> {
    await this.repository.createSync(dto);
  }
}
