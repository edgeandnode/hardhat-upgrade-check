# hardhat-upgrade-check
A tool to compare the storage layout of your current contracts vs a specific git commit/tag

## Installation
```
yarn global add hardhat-upgrade-check
```

## Usage

```sh
// In the root folder of your hardhat project
hardhat-upgrade-check <tag or git commit to compare> [--contracts <c1,c2,c3>]
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

## Local development

```bash
# on this repo
yarn build && yarn link
# and then it will be available as a global script
hardhat-upgrade-check
```
