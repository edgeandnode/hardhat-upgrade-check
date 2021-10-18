import gitDiff from 'git-diff'
import chalk from 'chalk'
import boxen from 'boxen'

import { ReportLine, ReportResult } from './types'

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

export function reportToStdout(report: Record<string, ReportResult>): string {
  let output = ''

  function formatEntry(entry: ReportLine) {
    let result = ''
    const caret =
      entry.severity === 'error'
        ? chalk.bold.redBright('❯')
        : chalk.bold.yellowBright('❯')
    result += `${caret} Variable: ${chalk.cyanBright(entry.variable)}`
    result += `\n  Rule: ${chalk.cyanBright(entry.rule)}`
    result += `\n  Changes:`
    const diff =
      gitDiff(entry.expected, entry.got, { noHeaders: true, color: true }) ?? ''
    // show diff in a box
    result += `\n  ${boxen(diff, { borderColor: 'grey' }).replace(
      /\n/g,
      '\n  ',
    )}\n`
    if (entry.typeDefinitions) {
      // Add table with type definitions
      result += `  Type definition changes for ${chalk.cyanBright(
        entry.typeDefinitions.label,
      )}:`
      const typeDefDiff =
        gitDiff(entry.typeDefinitions.expected, entry.typeDefinitions.got, {
          noHeaders: true,
          color: true,
        }) ?? ''
      // show type definition diff inside a box
      result += `\n  ${boxen(typeDefDiff, { borderColor: 'grey' }).replace(
        /\n/g,
        '\n  ',
      )}\n`
    }
    result += '\n'
    return result
  }

  let totalErrors = 0
  let totalWarnings = 0

  for (const contract in report) {
    if (
      report[contract].error.length === 0 &&
      report[contract].warning.length === 0
    ) {
      continue
    }
    let contractEntry = ''

    contractEntry += chalk.bold.redBright('Errors\n\n')
    for (const error of report[contract].error) {
      contractEntry += formatEntry(error)
      totalErrors += 1
    }
    if (report[contract].error.length === 0) contractEntry += '  None\n\n'

    contractEntry += chalk.bold.yellowBright('Warnings\n\n')
    for (const warning of report[contract].warning) {
      contractEntry += formatEntry(warning)
      totalWarnings += 1
    }
    if (report[contract].warning.length === 0) contractEntry += '  None\n\n'

    output += boxen(contractEntry, {
      title: chalk.whiteBright.bold(contract),
      borderColor: 'grey',
      padding: 1,
    })
    output += '\n'
  }

  output += `\nFound ${totalErrors} errors and ${totalWarnings} warnings`

  return output
}
