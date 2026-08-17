export function nextStepPath(slug: string, step: string, agentPrefix?: string): string {
  const base = agentPrefix ?? `/agent/${slug}`
  switch (step) {
    case 'verify_email':     return `${base}/verify-email`
    case 'complete_profile': return `${base}/complete-profile`
    case 'verify_phone':     return `${base}/verify-phone`
    case 'accept_terms':     return `${base}/accept-terms`
    default:                 return base
  }
}
