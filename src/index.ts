import os from 'os'
import fs from 'fs'
import { execSync } from 'child_process';
import yargs, { Argv } from 'yargs'

import { StorageLayout } from './storageLayout';

const TOOL_DIR='~/.upgrade-check'

function requireUncached(module) {
    delete require.cache[require.resolve(module)];
    return require(module);
}

const defaultCommand = {
    command: '$0 <tag> [--contracts <c1,c2,c3>]',
    describe: 'Compare storage layout of current contracts vs a specific git commit/tag',
    builder: (yargs: Argv): Argv => {
      return yargs
        .positional('tag', { type: 'string' })
        .option('contracts', {
            description: 'Comma-separated list of contract names',
            type: 'string',
            required: false,
        })
    },
    handler: async (argv: { [key: string]: any } & Argv['argv']): Promise<void> => {
        const { tag } = argv
        // cleanup
        const outputDirectory = TOOL_DIR.replace('~', os.homedir());
        if (fs.existsSync(outputDirectory)) {
          execSync(`rm -rf ${outputDirectory}`)
          fs.mkdirSync(outputDirectory);
        }
        // get repo details
        const repoURL = execSync('git config --get remote.origin.url').toString().trim()
        const repoName = execSync('basename "$(pwd)"').toString().trim()
        // clone repo
        execSync(`git clone --depth 1 --branch ${tag} ${repoURL} ${outputDirectory}/${repoName}`)
        // generate report for new contracts
        let hre = requireUncached('hardhat')
        await hre.run("compile");
        let storageLayout = new StorageLayout(hre)
        await storageLayout.export({ directory: outputDirectory, filename: 'new-contracts-report' })
        // change hardhat context
        hre = null
        process.chdir(`${outputDirectory}/${repoName}`)
        execSync(`cd ${outputDirectory}/${repoName}`)
        // generate report for contracts of <tag>
        hre = requireUncached('hardhat')
        await hre.run("compile");
        storageLayout = new StorageLayout(hre)
        await storageLayout.export({ directory: outputDirectory, filename: 'old-contracts-report' })
    },
  }

yargs
  .scriptName('hardhat-upgrade-check')
  .command(defaultCommand)
  .help().argv