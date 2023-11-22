export type Connector = {
  type: string;
  parameters: { [key: string]: any };
};

export type NucliaOptions = {};
export type Classification = {};

export type Source = {
  connector: Connector;
  destination: NucliaOptions;
  folders: string[];
  permanentSync?: boolean;
  labels?: Classification[];
  id: string;
};
