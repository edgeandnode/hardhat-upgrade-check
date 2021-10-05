export interface StateVariable {
  name: string;
  slot: string;
  offset: number;
  type: string;
  typeHash: string;
}

export interface Row {
  name: string;
  stateVariables: StateVariable[];
  types: Record<string, TypeDefinition>;
}

export interface TypeDefinition {
  encoding: string;
  key?: string;
  members?: any;
  label: string;
  numberOfBytes: string;
  value?: string;
}

export interface Table {
  contracts: Row[];
}

export interface ExportConfig {
  directory: string
  filename: string
  contractNames?: string
  debug?: boolean
}
