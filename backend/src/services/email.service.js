function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function getAppUrl() {
  const configuredUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL?.split(",")[0]?.trim();
  if (!configuredUrl) throw new Error("FRONTEND_URL is not configured.");
  const url = new URL(configuredUrl);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("FRONTEND_URL must be a valid http or https URL.");
  }
  return url.origin;
}

async function sendTransactionalEmail({ email, recipientName, subject, htmlContent, textContent }) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER;
  const senderName = process.env.BREVO_SENDER_NAME || "OrbitU";
  if (!apiKey || !senderEmail) throw new Error("Brevo email sender is not configured.");

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email, name: recipientName || undefined }],
      subject,
      htmlContent,
      textContent,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    // Do not bubble up Brevo's response body; it can contain account or sender details.
    throw new Error(`Brevo rejected the email (HTTP ${response.status}).`);
  }
}

export async function sendPasswordResetEmail({ email, name, token }) {
  const resetUrl = new URL("/reset-password", getAppUrl());
  resetUrl.searchParams.set("token", token);
  const safeName = escapeHtml(name || "there");
  const safeUrl = escapeHtml(resetUrl.toString());
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;color:#17182d;max-width:560px;margin:0 auto;padding:32px">
      <h1 style="font-size:24px">Reset your OrbitU password</h1>
      <p>Hi ${safeName},</p>
      <p>We received a request to reset your password. This link expires in 30 minutes and can only be used once.</p>
      <p style="margin:28px 0"><a href="${safeUrl}" style="background:#ffe35b;color:#17182d;padding:14px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Choose a new password</a></p>
      <p>If you did not request this, you can ignore this email. Your password will not change.</p>
      <p style="font-size:12px;color:#777386">If the button does not work, copy this address into your browser:<br>${safeUrl}</p>
    </div>`;

  await sendTransactionalEmail({
    email,
    recipientName: name,
    subject: "Reset your OrbitU password",
    htmlContent,
    textContent: `Hi ${name || "there"}, reset your OrbitU password using this one-time link (expires in 30 minutes): ${resetUrl}`,
  });
}

export async function sendSignupVerificationEmail({ email, name, code }) {
  const safeName = escapeHtml(name || "there");
  const safeCode = escapeHtml(code);
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;color:#17182d;max-width:560px;margin:0 auto;padding:32px">
      <h1 style="font-size:24px">Verify your OrbitU email</h1>
      <p>Hi ${safeName},</p>
      <p>Enter this code in the signup screen to verify your email address:</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:8px;background:#f5f1ff;padding:18px;border-radius:12px;text-align:center">${safeCode}</p>
      <p>This code expires in 10 minutes and can only be used once. If you did not start an OrbitU signup, you can ignore this email.</p>
    </div>`;

  await sendTransactionalEmail({
    email,
    recipientName: name,
    subject: "Your OrbitU verification code",
    htmlContent,
    textContent: `Hi ${name || "there"}, your OrbitU email verification code is ${code}. It expires in 10 minutes.`,
  });
}
