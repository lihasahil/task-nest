import { z } from "zod";
import { httpError } from "../common/http-error";
import { config } from "../config";
import { MessageStatus } from "../types/models";

const sendBodySchema = z.object({
  to: z
    .array(z.string())
    .min(1, {
      message: `"to" must contain at least 1 phone number`,
    })
    .max(config.maxRecipients, {
      message: `"to" must contain at most ${config.maxRecipients} phone numbers`,
    }),

  message: z
    .string()
    .trim()
    .min(1, { message: '"message" must not be empty' })
    .max(2000, {
      message: '"message" must not exceed 2000 characters',
    }),
});

export function parseSendBody(body: unknown): z.infer<typeof sendBodySchema> {
  const result = sendBodySchema.safeParse(body);

  if (!result.success) {
    throw httpError(400, result.error.issues[0].message);
  }

  return result.data;
}

const messageStatuses = ["pending", "sent", "failed"] as const;

const logsQuerySchema = z.object({
  status: z.enum(messageStatuses).optional(),

  from: z.iso.datetime({ offset: true }).or(z.iso.date()).optional(),

  to: z.iso.datetime({ offset: true }).or(z.iso.date()).optional(),

  number: z.string().optional(),

  page: z.coerce.number().int().min(1).max(1_000_000).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export interface LogsQuery {
  status?: MessageStatus;
  from?: Date;
  to?: Date;
  toExclusive: boolean;
  number?: string;
  page: number;
  limit: number;
}

export function parseLogsQuery(query: Record<string, unknown>): LogsQuery {
  const result = logsQuerySchema.safeParse(query);

  if (!result.success) {
    throw httpError(400, result.error.issues[0].message);
  }

  const data = result.data;

  let toDate = data.to ? new Date(data.to) : undefined;
  let toExclusive = false;

  if (data.to && /^\d{4}-\d{2}-\d{2}$/.test(data.to) && toDate) {
    // A bare date includes the entire day.
    toDate.setUTCDate(toDate.getUTCDate() + 1);
    toExclusive = true;
  }

  return {
    status: data.status as MessageStatus | undefined,
    from: data.from ? new Date(data.from) : undefined,
    to: toDate,
    toExclusive,
    number: data.number,
    page: data.page,
    limit: data.limit,
  };
}
