import 'hardhat/types/config'
import 'hardhat/types/runtime'

declare module 'hardhat/types/runtime' {
  // This is an example of an extension to the Hardhat Runtime Environment.
  // This new field will be available in tasks' actions, scripts, and tests.
  export interface HardhatRuntimeEnvironment {
    upgradeCheck: (gitCommitOrTag: string, contracts?: string[]) => void
  }
}
