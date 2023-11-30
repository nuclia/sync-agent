import { getConnector } from '../../../connector/infrastructure/factory';
import { ISyncEntity } from '../sync.entity';

type Values = Partial<ISyncEntity> & { id: string };
export class UpdateSyncDto {
  private constructor(public readonly options: Values) {}

  get values() {
    const returnObj: Values = {
      id: this.options.id,
    };

    if (this.options.connector) returnObj.connector = this.options.connector;
    if (this.options.kb) returnObj.kb = this.options.kb;
    if (this.options.labels) returnObj.labels = this.options.labels;
    if (this.options.title) returnObj.title = this.options.title;

    return returnObj;
  }

  static create(props: Values): [string?, UpdateSyncDto?] {
    const { id, connector, kb } = props;

    if (!id) {
      return ['id is mandatory'];
    }
    if (connector) {
      const connectorDefinition = getConnector(connector?.name || '');
      if (!connectorDefinition) {
        return ['Connector definition is not defined'];
      }
      const sourceConnector = connectorDefinition.factory();
      if (!sourceConnector.areParametersValid(connector.parameters)) {
        return [`Connector ${connector.name} parameters are not valid`];
      }
    }
    const isDefined = (value: unknown) => value !== null && value !== undefined;

    if (kb) {
      const { knowledgeBox, zone, backend, apiKey } = kb;
      if (isDefined(knowledgeBox) && !knowledgeBox) {
        return ['knowledgeBox is mandatory'];
      }
      if (isDefined(zone) && !zone) {
        return ['zone is mandatory'];
      }
      if (isDefined(backend) && !backend) {
        return ['backend is mandatory'];
      }
      if (isDefined(apiKey) && !apiKey) {
        return ['apiKey is mandatory'];
      }
    }

    return [undefined, new UpdateSyncDto(props)];
  }
}
