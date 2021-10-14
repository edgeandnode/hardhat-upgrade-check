import path from 'path'
import { execSync } from 'child_process'
import { extendConfig, extendEnvironment, task } from 'hardhat/config'
import { HardhatConfig, HardhatUserConfig } from 'hardhat/types'

import './type-extensions'

/**
 * Check that the current changes in contracts won't break the storage layout defined
 * by the previous version of the contracts
 *
 * @export
 * @param {string} gitCommitOrTag a git commit or tag to use to compare current layout changes against
 * @param {string[]} [contracts] contract names to show on the report
 */
export function upgradeCheck(
  gitCommitOrTag: string,
  contracts?: string[],
): void {
  const contractsFilter = contracts?.length
    ? `--contracts=${contracts.join(',')}`
    : ''
  const binPath = path.resolve(__dirname, '..', 'bin', 'hardhat-upgrade-check')
  // HUC_LOCAL_MODE=true let's the script know it should resolve its files
  // within the local node_modules folder instead of the global node installation
  try {
    execSync(
      `HUC_LOCAL_MODE=true ${binPath} ${gitCommitOrTag} ${contractsFilter}`,
      { stdio: 'inherit' },
    )
  } catch (error) {
    process.exit(1)
  }
}

extendConfig(
  (config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
    config.upgradeCheck = {
      repoVersion: userConfig.upgradeCheck?.repoVersion,
      contracts: userConfig.upgradeCheck?.contracts,
    }
  },
)

extendEnvironment(hre => {
  hre.upgradeCheck = upgradeCheck
})

task(
  'upgrade-check',
  "check that the current contracts don't break the previous storage layout",
).setAction(async (_, hre) => {
  const upgradeCheckConfig = hre.config.upgradeCheck
  hre.upgradeCheck(upgradeCheckConfig.repoVersion, upgradeCheckConfig.contracts)
})
