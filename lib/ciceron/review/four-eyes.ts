/** Pure four-eyes check mirrored by decide_review / deliveries_tier2_gate. */

export function isFourEyesOutputType(
  outputType: string | null | undefined,
  fourEyesTypes: readonly string[]
): boolean {
  if (!outputType) return false
  return fourEyesTypes.includes(outputType)
}

/**
 * Editor of a human draft cannot be the final approver when four-eyes is on.
 * Pure approve (no prior human edit by this actor) is allowed.
 */
export function canFinalApproveUnderFourEyes(opts: {
  fourEyesOn: boolean
  decision: 'approved' | 'corrected' | 'rejected' | 'returned'
  actorId: string
  humanEditAuthorId: string | null
}): { ok: true } | { ok: false; reason: string } {
  if (!opts.fourEyesOn) return { ok: true }
  if (opts.decision === 'rejected' || opts.decision === 'returned') return { ok: true }

  if (opts.decision === 'corrected') {
    return {
      ok: false,
      reason: 'four-eyes: editor cannot give final approval',
    }
  }

  if (
    opts.decision === 'approved' &&
    opts.humanEditAuthorId &&
    opts.humanEditAuthorId === opts.actorId
  ) {
    return {
      ok: false,
      reason: 'four-eyes: editor cannot give final approval',
    }
  }

  return { ok: true }
}
