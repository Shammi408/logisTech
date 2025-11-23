import { RequestHandler } from "express";
import { ZodSchema } from "zod";

/*
    Returns an express middleware that validates req.body with given zod schema.
    On failure returns 400 with readable error messages.
*/
export function validateBody<T extends ZodSchema>(schema: T): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.issues.map(i => ({
        path: i.path.join("."),
        message: i.message,
      }));
      return res.status(400).json({ error: "Invalid request body", issues });
    }
    // replace req.body with parsed/typed data
    req.body = result.data;
    next();
  };
}
