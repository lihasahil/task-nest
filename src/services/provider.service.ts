import * as providerRepo from '../repositories/provider.repository';
import { computeHealth } from '../utils/route-health';

export async function health() {
  const rows = await providerRepo.healthStats();
  return rows.map((r) => {
    const h = computeHealth(r);
    return {
      name: r.name,
      priority: r.priority,
      enabled: r.enabled,
      balance: r.balance,
      attempts24h: h.attempts,
      successRate24h: h.successRate,
      healthPercent: h.health,
    };
  });
}
