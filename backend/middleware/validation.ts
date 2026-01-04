import { RequestHandler } from 'express';
import { ZodTypeAny, z } from 'zod';
import { BAD_REQUEST_ERROR } from '../utils/error';

const validate = (
  schema: ZodTypeAny,
  source: 'body' | 'params' | 'query'
): RequestHandler => {
  return async (req, res, next) => {
    try {
      await schema.parseAsync(req[source]);
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errorMessage = err.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ');
        next(new BAD_REQUEST_ERROR(errorMessage));
      } else {
        next(err);
      }
    }
  };
};

const validateRequestBody = (schema: ZodTypeAny): RequestHandler => {
  return validate(schema, 'body');
};

const validateRequestParams = (schema: ZodTypeAny): RequestHandler => {
  return validate(schema, 'params');
};

const validateRequestQuery = (schema: ZodTypeAny): RequestHandler => {
  return validate(schema, 'query');
};

export { validateRequestBody, validateRequestParams, validateRequestQuery };