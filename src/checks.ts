import {
  CheckContext,
  CheckFn,
  Contract,
  ReportLine,
  ReportResult,
  StateVariable,
} from './types'

const CHECKS: CheckFn[] = [checkSlotChanged, checkTypeChanged]

export function runChecks(results: ReportResult, context: CheckContext): void {
  for (const checkFn of CHECKS) {
    const result = checkFn(context)
    if (result) {
      results[result.severity].push(result)
    }
  }
}

/**
 * @dev Checks if the variable changed slot
 *
 */
export function checkSlotChanged(context: CheckContext): ReportLine | null {
  let result: ReportLine | null = null
  const { stateVariableIndex, oldContract, newContract } = context
  const newStateVariable = safeGetStateVar(newContract, stateVariableIndex)
  const oldStateVariable = safeGetStateVar(oldContract, stateVariableIndex)

  if (newStateVariable && oldStateVariable) {
    const diffs = stateVariableDiff(newStateVariable, oldStateVariable)
    // if slot is different then that's a breaking change
    if (diffs.includes('slot')) {
      result = {
        severity: 'error',
        expected: `${oldStateVariable.name} on slot ${oldStateVariable.slot}`,
        got: `${newStateVariable.name} on slot ${newStateVariable.slot}`,
      }
    }
  }

  return result
}

/**
 * @dev Checks if the variable changed type, and type hash
 *
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
    if (!diffs.includes('slot') && diffs.includes('typeHash')) {
      result = {
        severity: 'warning',
        expected: `${oldStateVariable.name} with type ${oldStateVariable.type} (${oldStateVariable.typeHash})`,
        got: `${newStateVariable.name} with type ${newStateVariable.type} (${newStateVariable.typeHash})`,
      }
    }
  }

  return result
}

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

export function safeGetStateVar(
  contract: Contract,
  index: number,
): StateVariable | null {
  return contract.stateVariables.length > index
    ? contract.stateVariables[index]
    : null
}
