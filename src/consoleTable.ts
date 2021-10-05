import { Table } from "console-table-printer";

import { Row } from "./types";

export class ConsoleTable {
  public table: Row[];

  constructor(data: Row[]) {
    this.table = data;
  }

  public get(): Row[] {
    return this.table;
  }

  public print() {
    if (!this.table.length) {
      console.error("Table has empty fields");
    } else {
      const p = new Table({
        columns: [
          { name: "contract", alignment: "left" },
          { name: "state_variable", alignment: "left" },
          { name: "storage_slot", alignment: "center" },
          { name: "offset", alignment: "center" },
          { name: "type", alignment: "left" },
          { name: "type_hash", alignment: "left" }
        ]
      });

      try {
        for (const contract of this.table) {
          for (const stateVariable of contract.stateVariables) {
            const row = {
              contract: contract.name,
              state_variable: stateVariable.name,
              storage_slot: stateVariable.slot,
              offset: stateVariable.offset,
              type: stateVariable.type,
              type_hash: stateVariable.typeHash
            }
            p.addRow(row);
          }
        }
        p.printTable();
      } catch (e) {
        console.log(e);
      }
    }
  }
}
