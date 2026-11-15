import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  text: { type: String, required: true, trim: true, minlength: 1, maxlength: 2000 },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
  editedAt: { type: Date, default: null },
  reactions: { type: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, emoji: { type: String, required: true, maxlength: 8 } }], default: [] },
  readAt: { type: Date, default: null },
}, { timestamps: true });

messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, sender: 1, createdAt: -1 });

export default mongoose.models.Message || mongoose.model("Message", messageSchema);
