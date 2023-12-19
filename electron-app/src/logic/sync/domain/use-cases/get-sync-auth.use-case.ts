import { CustomError } from '../../../errors';
import { ISyncRepository } from '../sync.repository';
import { getConnector } from '../../../connector/infrastructure/factory';

export interface GetSyncAuthUseCase {
  execute(id: string): Promise<boolean>;
}

export class GetSyncAuth implements GetSyncAuthUseCase {
  constructor(private readonly repository: ISyncRepository) {}

  async execute(id: string) {
    const data = await this.repository.getSync(id);
    if (data === null) {
      throw new CustomError(`Sync with id ${id} not found`, 404);
    }
    const connectorDefinition = getConnector(data.connector?.name || '');
    if (!connectorDefinition) {
      return false;
    }
    const sourceConnector = connectorDefinition.factory();
    sourceConnector.setParameters(data.connector?.parameters ?? {});
    return sourceConnector.hasAuthData();
  }
}
