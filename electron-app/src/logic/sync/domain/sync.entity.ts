import { Classification, Connector, NucliaOptions } from '../../../types/server';

export interface ISyncEntity {
  connector: Connector;
  kb: NucliaOptions;
  folders: string[];
  labels?: Classification[];
  title: string;
  id: string;
}
