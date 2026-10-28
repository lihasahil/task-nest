// Route health:
//   successRate   = successful attempts / all attempts in the last 24 h (no attempts = 100%)
//   balanceFactor = min(1, balance / 500)
//   health %      = round(successRate x balanceFactor);  0 if disabled or balance is 0
export const LOW_BALANCE = 500;

export function computeHealth(r: { enabled: boolean; balance: number; successes: number; failures: number }) {
  const attempts = r.successes + r.failures;
  const successRate = attempts === 0 ? null : Math.round((r.successes / attempts) * 1000) / 10;
  if (!r.enabled || r.balance <= 0) return { attempts, successRate, health: 0 };
  const health = Math.round((successRate ?? 100) * Math.min(1, r.balance / LOW_BALANCE));
  return { attempts, successRate, health };
}
