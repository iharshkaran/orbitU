const WINDOW_MS = 15 * 60 * 1000;

function rateLimit({ limit, message, countSuccessful = false }) {
  const buckets = new Map();
  return function authRateLimit(req, res, next) {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || "unknown";
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + WINDOW_MS };
      buckets.set(key, bucket);
    }

    if (bucket.count >= limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.set("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({ success: false, message });
    }

    // Count failed sign-ins, and every registration attempt to deter account spam.
    res.once("finish", () => {
      if (countSuccessful || res.statusCode >= 400) bucket.count += 1;
    });

    // Prune expired entries periodically to keep this process-local map bounded.
    if (buckets.size > 1000) {
      for (const [bucketKey, entry] of buckets) {
        if (entry.resetAt <= now) buckets.delete(bucketKey);
      }
    }

    return next();
  };
}

export const limitLoginAttempts = rateLimit({
  limit: 10,
  message: "Too many sign-in attempts. Please wait 15 minutes and try again.",
});

export const limitRegistrationAttempts = rateLimit({
  limit: 5,
  message: "Too many account creation attempts. Please wait 15 minutes and try again.",
  countSuccessful: true,
});

export const limitPasswordResetRequests = rateLimit({
  limit: 3,
  message: "Too many password reset requests. Please wait 15 minutes and try again.",
  countSuccessful: true,
});

export const limitPasswordResetAttempts = rateLimit({
  limit: 10,
  message: "Too many password reset attempts. Please wait 15 minutes and try again.",
});

export const limitSignupCodeSends = rateLimit({
  limit: 3,
  message: "Too many verification code requests. Please wait 15 minutes and try again.",
  countSuccessful: true,
});

export const limitSignupCodeAttempts = rateLimit({
  limit: 10,
  message: "Too many verification attempts. Please wait 15 minutes and try again.",
});
