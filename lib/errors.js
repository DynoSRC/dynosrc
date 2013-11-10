var errors = [
  {
    error: 'SERVER_ERROR',
    description: 'Unknown server error',
    code: -1,
    http: 500
  },
  {
    error: 'NOT_FOUND',
    description: 'Asset not found',
    code: 1,
    http: 404
  },
  {
    error: 'INVALID_REQUEST',
    description: 'Invalid patch request',
    code: 2,
    http: 400
  }
];

module.exports = errors.reduce(function(m, err) {
  m[err.error] = err;
  return m;
}, {});