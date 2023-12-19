/* eslint-disable @typescript-eslint/no-explicit-any */
import { ZodIssue, ZodObject } from 'zod';

export const validateZodSchema = (schema: ZodObject<any>, data: any) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(result.error.issues.map((issue: ZodIssue) => issue.message).join(', '));
  }
  return result.data;
};
