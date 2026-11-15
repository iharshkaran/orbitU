import mongoose from "mongoose";

const signupEmailVerificationSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  codeHash: { type: String, required: true, select: false },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  attempts: { type: Number, default: 0 },
  sendCount: { type: Number, default: 1 },
  sendWindowStartedAt: { type: Date, required: true },
  lastSentAt: { type: Date, required: true },
}, { timestamps: true });

export default mongoose.models.SignupEmailVerification || mongoose.model("SignupEmailVerification", signupEmailVerificationSchema);
