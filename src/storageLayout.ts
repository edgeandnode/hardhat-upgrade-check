import crypto from "crypto";
import fs from "fs";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { ConsoleTable } from "./consoleTable";
import { ExportConfig, Row, Table, TypeDefinition } from "./types";

function typeHash(type: string, types: Record<string, TypeDefinition>) {
  const typeDefinition = types[type]
  if(typeDefinition.value) {
    typeDefinition.value = types[typeDefinition.value] ? JSON.stringify(types[typeDefinition.value]) : typeDefinition.value
  }
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(typeDefinition))
    .digest("hex").slice(0, 12); // arbitrary length for display purposes
}

export class StorageLayout {
  public env: HardhatRuntimeEnvironment;

  constructor(hre: HardhatRuntimeEnvironment) {
    this.env = hre;
  }

  public async export(exportConfig: ExportConfig) {
    const data: Table = { contracts: [] };

    for (const fullName of await this.env.artifacts.getAllFullyQualifiedNames()) {
      const {
        sourceName,
        contractName
      } = await this.env.artifacts.readArtifact(fullName);

      for (const artifactPath of await this.env.artifacts.getBuildInfoPaths()) {
        const artifact: Buffer = fs.readFileSync(artifactPath);
        const artifactJsonABI = JSON.parse(artifact.toString());
        const contractAST = artifactJsonABI.output.contracts[sourceName] ? 
          artifactJsonABI.output.contracts[sourceName][contractName] : 
          null;
        try {
          if (!contractAST || !contractAST.storageLayout || !contractAST.storageLayout.types) {
            continue;
          }
        } catch (e) {
          continue;
        }
        const contract: Row = {
          name: contractName,
          stateVariables: [],
          types: {}
        };
        // Collect types
        for (const [typeName, typeDef] of Object.entries(
          contractAST.storageLayout.types as Record<string, TypeDefinition>
        )) {
          contract.types[typeName] = typeDef;
        }
        // Map storage layout
        for (const stateVariable of contractAST.storageLayout.storage) {
          contract.stateVariables.push({
            name: stateVariable.label,
            slot: stateVariable.slot,
            offset: stateVariable.offset,
            type: stateVariable.type,
            typeHash: typeHash(stateVariable.type, contract.types)
          });
        }
        data.contracts.push(contract);
      }
    }
    // Export
    const report = JSON.stringify(data, null, 2);
    const reportName = exportConfig.filename
    const outputDirectory = exportConfig.directory
    fs.writeFileSync(`${outputDirectory}/${reportName}.json`, report);
    const consoleTable = new ConsoleTable(data.contracts);
    consoleTable.print();
  }
}
