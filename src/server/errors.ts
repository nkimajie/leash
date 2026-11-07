/** Something the caller asked for doesn't exist. Routes answer with 404. */
export class NotFoundError extends Error {
  readonly status = 404;
}

/** The request clashes with the current state, e.g. denying an already approved purchase. Routes answer with 409. */
export class ConflictError extends Error {
  readonly status = 409;
}

/** The request body is missing or invalid. Routes answer with 400. */
export class BadRequestError extends Error {
  readonly status = 400;
}

/** The caller didn't prove who it is, e.g. a wrong cron secret. Routes answer with 401. */
export class UnauthorizedError extends Error {
  readonly status = 401;
}
