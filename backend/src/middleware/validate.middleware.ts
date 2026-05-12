import type { RequestHandler } from "express";
import type { AnyZodObject } from "zod";

export function validateRequest(schema: AnyZodObject): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params
    });

    if (!result.success) {
      next(result.error);
      return;
    }

    req.body = result.data.body;
    req.query = result.data.query;
    req.params = result.data.params;
    next();
  };
}
