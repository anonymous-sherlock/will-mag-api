import { jsonContent } from "stoker/openapi/helpers";
import { z } from "zod";

export const BaseErrorSchema = z.object({
  message: z.string(),
  statusText: z.string(),
  status: z.number(),
});

interface ErrorBase {
  status: number;
  statusText: string;
  defaultMessage: string;
}
export function createErrorResponse({ status, statusText, defaultMessage }: ErrorBase) {
  return (message: string = defaultMessage) => {
    return jsonContent(
      BaseErrorSchema.extend({
        message: z.string().openapi({ example: message }),
        status: z.number().openapi({ example: status }),
        statusText: z.string().openapi({ example: statusText }),
      }),
      message,
    );
  };
}

export type BaseError = z.infer<typeof BaseErrorSchema>;
