# hardhat-upgrade-check
A tool to compare the storage layout of your current contracts vs a specific git commit/tag
and make sure they are safe to upgrade through a transparent proxy.

## Requirements
- NodeJS >= 14.0
- yarn
- git
- unix based OS

## Installation
As a CLI
```
yarn global add hardhat-upgrade-check
```

As a hardhat plugin
```
yarn add hardhat-upgrade-check
```

## Usage

As a CLI
```sh
// In the root folder of your hardhat project
hardhat-upgrade-check <tag or git commit to compare> [--contracts <c1,c2,c3>]
```

As a hardhat plugin
```
npx hardhat upgrade-check
```

## Configuration

In order to use this tool, you should update the solidity compiler configurations of your contracts repo `hardhat.config.ts` as follows:

```javascript
module.exports = {
  solidity: {
    version: '0.8.3',
    settings: {
        optimizer: {
            enabled: true,
            runs: 1000,
        },
        outputSelection: {
            "*": {
                "*": ["storageLayout"],
            },
          },
    },
  },
  ....
```

and also define which commit or tag you want to use as the base for the storage layout comparison with your current contracts

```javascript
  {
    ...
    upgradeCheck: {
      repoVersion: '<git commit or tag>',
      // optional contracts filter
      contracts: ['MyERC20', 'Controller']
    },
  }
```

## How it works

This tool creates a folder `/tmp/.upgrade-check/` in your tmp directory and clones the version of your repo there.
It will then install and compile your contracts for both versions of the repo with hardhat and generate a report of
the storage layout for each of them. Finally it compares the layouts and generates a markdown report `upgrade-report.md`
in the root of your repo. The tool also calls exit(1) if there are any errors so it can be incorporated in CI pipelines.

## Local development

```bash
# on this repo
yarn build && yarn link
# and then it will be available as a global script
hardhat-upgrade-check
```
