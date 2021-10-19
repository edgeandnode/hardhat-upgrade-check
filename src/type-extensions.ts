import 'hardhat/types/config'
import { HardhatConfig } from 'hardhat/types/config'
import 'hardhat/types/runtime'

declare module 'hardhat/types/config' {
  export interface HardhatConfig {
    upgradeCheck: {
      /** a git branch or tag */
      repoVersion: string
      /** list of contract names to show on the report */
      contracts?: string[]
      /** path with filename where the report will be stored */
      output?: string
    }
  }
  export interface HardhatUserConfig {
    upgradeCheck: {
      /** a git branch or tag */
      repoVersion: string
      /** list of contract names to show on the report */
      contracts?: string[]
      /** path with filename where the report will be stored */
      output?: string
    }
  }
}

declare module 'hardhat/types/runtime' {
  // This is an example of an extension to the Hardhat Runtime Environment.
  // This new field will be available in tasks' actions, scripts, and tests.
  export interface HardhatRuntimeEnvironment {
    upgradeCheck: (upgradeCheckConfig: HardhatConfig['upgradeCheck']) => void
  }
}
