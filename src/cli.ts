import os from 'os'

import { StorageLayout } from './storageLayout';

const TOOL_DIR='~/.upgrade-check'

async function main() {
        // cleanup
        const outputDirectory = TOOL_DIR.replace('~', os.homedir());
        // generate report for new contracts
        let hre = require('hardhat')
        await hre.run("compile");
        let storageLayout = new StorageLayout(hre)
        await storageLayout.export({ directory: outputDirectory, filename: 'new-contracts-report' })
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 