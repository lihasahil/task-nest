import { Request, Response } from "express";
import * as smsService from "../services/sms.service";
import { parseLogsQuery, parseSendBody } from "../validators/sms.validator";

export async function send(req: Request, res: Response) {
  const { to, message } = parseSendBody(req.body);
  res.json(await smsService.send(req.user!.id, to, message));
}

export async function logs(req: Request, res: Response) {
  res.json(await smsService.logs(req.user!.id, parseLogsQuery(req.query)));
}
