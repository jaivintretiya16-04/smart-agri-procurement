export function errorHandler(err, req, res, next) {
  console.error('⚠️ [ErrorHandler]:', err);

  // Check for PostgreSQL check_violation constraint (code 23514) or capacity constraint
  if (
    err.code === '23514' ||
    err.message?.includes('check constraint') ||
    err.message?.includes('chk_farmer_capacity') ||
    err.message?.includes('chk_quintal_capacity')
  ) {
    return res.status(409).json({
      error: true,
      code: 'CAPACITY_CONFLICT',
      message: 'Slot capacity was filled by a concurrent booking. Please choose another slot.',
    });
  }

  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  
  res.status(statusCode).json({
    error: true,
    code: err.code || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'An unexpected server error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
