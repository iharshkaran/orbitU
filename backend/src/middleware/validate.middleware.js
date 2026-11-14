export function validate(schema, source = "body") {
  return (req, _res, next) => {
    try { req.validated = schema.parse(req[source]); next(); }
    catch (error) { next(error); }
  };
}

export function validateParams(schema) {
  return (req, _res, next) => {
    try { schema.parse(req.params); next(); }
    catch (error) { next(error); }
  };
}
