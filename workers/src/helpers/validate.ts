import { Context } from "hono";
import { z } from "zod";

export class ValidationError extends Error {
  constructor(public details: Array<{ field: string; message: string }>) {
    super("Validation failed");
    this.name = "ValidationError";
  }
}

export async function validateJson<T>(
  c: Context,
  schema: z.ZodSchema<T>
): Promise<T> {
  const body = await c.req.json();
  try {
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.issues.map((issue: any) => ({
        field: issue.path.join(".") || "root",
        message: issue.message,
      }));
      throw new ValidationError(details);
    }
    throw error;
  }
}
