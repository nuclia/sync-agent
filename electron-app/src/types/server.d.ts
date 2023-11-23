export type Connector = {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
