import os from 'os'
import hre from 'hardhat'
import { StorageLayout } from './storageLayout'

const TOOL_DIR = '/tmp/.upgrade-check'

async function main() {
  const outputDirectory = TOOL_DIR.replace('~', os.homedir())
  const reportName: string = process.env.HUC_LAYOUT_REPORT_NAME || 'report'
  // generate storage layout report for contracts
  const storageLayout = new StorageLayout(hre)
  await storageLayout.export({
    directory: outputDirectory,
    filename: reportName,
  })
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
