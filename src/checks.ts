import gitDiff from 'git-diff'

import {
  CheckContext,
  CheckFn,
  Contract,
  ReportLine,
  ReportResult,
  StateVariable,
  TypeDefinition,
} from './types'

const CHECKS: CheckFn[] = [
  checkMissingVariable,
  checkSlotChanged,
  checkOrderChanged,
  checkTypeChanged,
  checkNameChanged,
]

export function runChecks(results: ReportResult, context: CheckContext): void {
  for (const checkFn of CHECKS) {
    const result = checkFn(context)
    if (result) {
      results[result.severity].push(result)
    }
  }
}

/**
 * @dev Checks if a variable is missing in the new contract
 *
 */
export function checkMissingVariable(context: CheckContext): ReportLine | null {
  let result: ReportLine | null = null
  const { stateVariableIndex, oldContract, newContract } = context
  const newStateVariable = safeGetStateVar(newContract, stateVariableIndex)
  const oldStateVariable = safeGetStateVar(oldContract, stateVariableIndex)

  if (newStateVariable === null && oldStateVariable) {
    const expected = `'${oldStateVariable.name}' on slot '${oldStateVariable.slot}'\n`
    const got = 'null'
    result = {
      variable: oldStateVariable.name,
      rule: 'checkMissingVariable',
      severity: 'error',
      expected,
      got,
      diff: textDiff(expected, got),
    }
  }

  return result
}

/**
 * @dev Checks if the variable changed slot or byte offset inside the slot
 */
export function checkSlotChanged(context: CheckContext): ReportLine | null {
  let result: ReportLine | null = null
  const { stateVariableIndex, oldContract, newContract } = context
  const oldStateVariable = safeGetStateVar(oldContract, stateVariableIndex)
  const newStateVariable = newContract.stateVariables.find(
    sv => sv.name === (oldStateVariable || {}).name,
  )

  if (newStateVariable && oldStateVariable) {
    const diffs = stateVariableDiff(newStateVariable, oldStateVariable)
    // if slot is different then that's a breaking change
    if (diffs.includes('slot') || diffs.includes('offset')) {
      const expected = `'${oldStateVariable.name}' on slot '${oldStateVariable.slot}'\n`
      const got = `'${newStateVariable.name}' on slot '${newStateVariable.slot}'\n`
      result = {
        variable: oldStateVariable.name,
        rule: 'checkSlotChanged',
        severity: 'error',
        expected,
        got,
        diff: textDiff(expected, got),
      }
    }
  }

  return result
}

/**
 * @dev Checks if the variable changed order
 */
export function checkOrderChanged(context: CheckContext): ReportLine | null {
  let result: ReportLine | null = null
  const { stateVariableIndex, oldContract, newContract } = context
  const newStateVariable = safeGetStateVar(newContract, stateVariableIndex)
  const oldStateVariable = safeGetStateVar(oldContract, stateVariableIndex)

  if (newStateVariable && oldStateVariable) {
    const diffs = stateVariableDiff(newStateVariable, oldStateVariable)
    // if slot is different then that's a breaking change
    if (diffs.includes('name') && diffs.includes('typeHash')) {
      const expected = `'${oldStateVariable.name}' with type '${oldStateVariable.type} on slot '${oldStateVariable.slot}'\n`
      const got = `'${newStateVariable.name}' with type '${newStateVariable.type} on slot '${newStateVariable.slot}'\n`
      result = {
        variable: oldStateVariable.name,
        rule: 'checkOrderChanged',
        severity: 'error',
        expected,
        got,
        diff: textDiff(expected, got),
      }
    }
  }

  return result
}

/**
 * @dev Checks if the variable changed type, and type hash
 * This check is aimed at struct and mapping type variables where changes in nested
 * types do not break the storage explicitly. Changes in primitive types will be
 * detected by #checkSlotChanged
 */
export function checkTypeChanged(context: CheckContext): ReportLine | null {
  let result: ReportLine | null = null
  const { stateVariableIndex, oldContract, newContract } = context
  const newStateVariable = safeGetStateVar(newContract, stateVariableIndex)
  const oldStateVariable = safeGetStateVar(oldContract, stateVariableIndex)

  if (newStateVariable && oldStateVariable) {
    const diffs = stateVariableDiff(newStateVariable, oldStateVariable)
    // slot is handled in another check.
    // no need to check type as hardhat appends a random number to typings
    // we trust the hash instead
    if (
      !diffs.includes('name') &&
      !diffs.includes('slot') &&
      diffs.includes('typeHash')
    ) {
      const expected = `'${oldStateVariable.name}' with type '${oldStateVariable.type} (${oldStateVariable.typeHash})'\n`
      const got = `'${newStateVariable.name}' with type '${newStateVariable.type} (${newStateVariable.typeHash})'\n`
      const expectedTypeDef: TypeDefinition =
        oldContract.types[oldStateVariable.type]
      if (expectedTypeDef.value)
        expectedTypeDef.value = JSON.parse(expectedTypeDef.value as string)
      const gotTypeDef: TypeDefinition =
        newContract.types[newStateVariable.type]
      if (gotTypeDef.value)
        gotTypeDef.value = JSON.parse(gotTypeDef.value as string)
      result = {
        variable: oldStateVariable.name,
        rule: 'checkTypeChanged',
        severity: 'warning',
        expected,
        got,
        diff: textDiff(expected, got),
        typeDefinitions: {
          label: ((expectedTypeDef.value as TypeDefinition) ?? expectedTypeDef)
            .label,
          expected: JSON.stringify(expectedTypeDef, null, 2),
          got: JSON.stringify(gotTypeDef, null, 2),
        },
      }
    }
  }

  return result
}

/**
 * @dev Checks if the variable changed name, but not type
 *
 */
export function checkNameChanged(context: CheckContext): ReportLine | null {
  let result: ReportLine | null = null
  const { stateVariableIndex, oldContract, newContract } = context
  const newStateVariable = safeGetStateVar(newContract, stateVariableIndex)
  const oldStateVariable = safeGetStateVar(oldContract, stateVariableIndex)

  if (newStateVariable && oldStateVariable) {
    const diffs = stateVariableDiff(newStateVariable, oldStateVariable)
    // slot is handled in another check.
    // no need to check type as hardhat appends a random number to typings
    // we trust the hash instead
    if (diffs.includes('name') && !diffs.includes('typeHash')) {
      const expected = `'${oldStateVariable.name}' with type '${oldStateVariable.type} (${oldStateVariable.typeHash})'\n`
      const got = `'${newStateVariable.name}' with type '${newStateVariable.type} (${newStateVariable.typeHash})'\n`
      result = {
        variable: oldStateVariable.name,
        rule: 'checkNameChanged',
        severity: 'warning',
        expected,
        got,
        diff: textDiff(expected, got),
      }
    }
  }

  return result
}
/**
 * Compare two state variables
 *
 * @param {StateVariable} sv1
 * @param {StateVariable} sv2
 * @return {string[]}  fields changed
 */
export function stateVariableDiff(
  sv1: StateVariable,
  sv2: StateVariable,
): string[] {
  const diffs: string[] = []
  for (const [key, value] of Object.entries(sv1)) {
    if (sv2[key] !== value) {
      diffs.push(key)
    }
  }
  return diffs
}

export function textDiff(expected: string, got: string): string {
  const diff = (
    gitDiff(expected, got, { noHeaders: true, flags: '--unified=10' }) ?? ''
  ).replace(/\n/g, '\n  ')
  return `  \`\`\`diff\n  ${diff}\n  \`\`\``
}

export function safeGetStateVar(
  contract: Contract,
  index: number,
): StateVariable | null {
  return contract.stateVariables.length > index
    ? contract.stateVariables[index]
    : null
}
