// Adoption rule: only replace an existing res.json() when the resulting shape is
// IDENTICAL — otherwise change the frontend in the same commit
const ok = (res, data = null, message = 'OK') =>
  res.status(200).json({ success: true, message, data });

const created = (res, data = null, message = 'Created') =>
  res.status(201).json({ success: true, message, data });

const noContent = (res) => res.status(204).end();

const paginated = (res, items, { page = 1, limit = 20, total = 0 }, message = 'OK') =>
  res.status(200).json({
    success: true,
    message,
    data: items,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit) || 1,
    },
  });

// Errors normally go through throw new ApiError(...) + errorMiddleware; this is
// only for places that must respond directly
const fail = (res, status, message, details) =>
  res.status(status).json({ success: false, message, ...(details && { details }) });

module.exports = { ok, created, noContent, paginated, fail };