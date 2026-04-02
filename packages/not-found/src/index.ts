import type { Request, Response } from "@google-cloud/functions-framework";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: "Not Found", path: req.path });
}
