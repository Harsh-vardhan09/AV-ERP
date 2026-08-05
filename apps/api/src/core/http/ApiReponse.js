/**
 * ONE response envelope for the whole API.
 *   { success: boolean, message: string, data: any }
 *
 * Adoption rule: only replace an existing res.json() when the resulting
 * shape is IDENTICAL. If a controller returns { success, students },
 * either leave it or change the frontend in the SAME commit.
 */

const ok = (res, data = null, message = 'OK') =>
  res.status(200).json({ success: true, message, data });

const created = (res, data = null, message = 'Created') =>
  res.status(201).json({ success: true, message, data });

const noContent = (res) => res.status(204).end();

// Paginated lists — one shape for every list endpoint in the app
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

// Errors normally go through `throw new ApiError(...)` + errorMiddleware.
// This is only for places you must respond directly.
const fail = (res, status, message, details) =>
  res.status(status).json({ success: false, message, ...(details && { details }) });

module.exports = { ok, created, noContent, paginated, fail };