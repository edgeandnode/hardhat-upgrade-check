/* eslint-disable @typescript-eslint/no-var-requires */
import fs from 'fs'
import yargs, { Argv } from 'yargs'
import { runChecks } from './checks'
import gitDiff from 'git-diff'

import { Contract, ReportLine, ReportResult } from './types'

/**
 * Checks if upgrading to the new contract is storage-safe and returns
 * the errors and warnings found, if any
 * @param oldContract the contract with the storage layout we want to keep
 * @param newContract the new version of the contract we want to check
 * @returns ReportResult
 */
export function checkContract(
  oldContract?: Contract,
  newContract?: Contract,
): ReportResult {
  const results = {
    error: [],
    warning: [],
  }

  if (oldContract !== undefined && newContract !== undefined) {
    for (const [i, _stateVariable] of oldContract.stateVariables.entries()) {
      // check that variable has the same name
      const context = {
        stateVariableIndex: i,
        newContract: newContract,
        oldContract: oldContract,
      }
      runChecks(results, context)
    }
  }

  return results
}

export function reportToMarkdown(report: Record<string, ReportResult>): string {
  let md = ''

  function formatEntry(entry: ReportLine) {
    let result = ''
    result += `\n- **Variable:** \`${entry.variable}\`\n`
    result += `\n  **Rule:** \`${entry.rule}\`\n`
    result += `\n  **Changes:**\n`
    result += `\n${entry.diff}\n`
    if (entry.typeDefinitions) {
      // Add table with type definitions
      result += `  **Type definition changes for \`${entry.typeDefinitions.label}\`:**`
      const typeDefDiff = (
        gitDiff(entry.typeDefinitions.expected, entry.typeDefinitions.got, {
          noHeaders: true,
        }) ?? ''
      ).replace(/\n/g, '\n  ')
      result += `\n  \`\`\`diff\n  ${typeDefDiff}\n  \`\`\``
    }
    return result
  }

  for (const contract in report) {
    if (
      report[contract].error.length === 0 &&
      report[contract].warning.length === 0
    ) {
      continue
    }
    let contractEntry = `\n## ${contract}\n`

    contractEntry += `### ❌ Errors\n`
    for (const error of report[contract].error) {
      contractEntry += formatEntry(error)
    }
    if (report[contract].error.length === 0) contractEntry += 'None\n'

    contractEntry += `### ⚠️ Warnings\n`
    for (const warning of report[contract].warning) {
      contractEntry += formatEntry(warning)
    }
    if (report[contract].warning.length === 0) contractEntry += 'None\n'

    contractEntry += '\n-----'

    md += contractEntry
  }

  return md
}

const defaultCommand = {
  command: '$0 <old-report> <new-report> [--contracts=<c1,c2,c3>]',
  describe: 'Compare storage layout of contract versions',
  builder: (yargs: Argv): Argv => {
    return yargs
      .positional('old-report', { type: 'string' })
      .positional('new-report', { type: 'string' })
      .option('contracts', {
        description: 'Comma-separated list of contract names',
        type: 'string',
        required: false,
      })
  },
  handler: async (
    argv: { [key: string]: any } & Argv['argv'],
  ): Promise<void> => {
    const { oldReport, newReport, contracts } = argv

    const oldContracts: Contract[] = require(oldReport).contracts
    const newContracts: Contract[] = require(newReport).contracts
    let contractNames = new Set(
      oldContracts.map(c => c.name).concat(newContracts.map(c => c.name)),
    )
    // filter contracts
    if (contracts) {
      const contractsFilter = contracts.split(',')
      contractNames = new Set(
        Array.from(contractNames).filter(name =>
          contractsFilter.includes(name),
        ),
      )
    }

    const results: Record<string, ReportResult> = {}

    let anyErrors = false

    for (const contractName of contractNames) {
      const newContract = newContracts.find(c => c.name === contractName)
      const oldContract = oldContracts.find(c => c.name === contractName)
      const result = checkContract(oldContract, newContract)
      results[contractName] = result
      anyErrors = anyErrors || result.error.length > 0
    }
    const reportMD = reportToMarkdown(results)
    console.log(reportMD)
    fs.writeFileSync('./upgrade-report.md', reportMD)
    if (anyErrors) {
      console.error('❌ Error: Upgrade is not safe')
      process.exit(1)
    }
  },
}

yargs.scriptName('upgrade-checker').command(defaultCommand).help().argv
