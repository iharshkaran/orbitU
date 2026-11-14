import mongoose from "mongoose";

const requestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, trim: true, maxlength: 500, default: "" },
  status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
}, { timestamps: true });

const milestoneSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 100 },
  dueDate: { type: Date, default: null },
  status: { type: String, enum: ["upcoming", "completed"], default: "upcoming" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 600, default: "" },
  status: { type: String, enum: ["backlog", "in_progress", "done"], default: "backlog", index: true },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  milestone: { type: mongoose.Schema.Types.ObjectId, default: null },
  dueDate: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

const activitySchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, enum: ["created", "updated", "status_changed", "assigned", "deleted"], required: true },
  kind: { type: String, enum: ["task", "milestone"], required: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  summary: { type: String, trim: true, maxlength: 300, default: "" },
}, { timestamps: true });

const collaborationProjectSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  skills: { type: [{ type: String, trim: true, maxlength: 40 }], default: [], validate: [(items) => items.length <= 12, "Choose at most 12 skills."] },
  roles: { type: [{ type: String, trim: true, maxlength: 60 }], default: [], validate: [(items) => items.length <= 8, "Choose at most 8 roles."] },
  teamSize: { type: Number, min: 2, max: 12, default: 4 },
  members: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], default: [] },
  requests: { type: [requestSchema], default: [] },
  milestones: { type: [milestoneSchema], default: [], validate: [(items) => items.length <= 30, "A project can have at most 30 milestones."] },
  tasks: { type: [taskSchema], default: [], validate: [(items) => items.length <= 200, "A project can have at most 200 tasks."] },
  activity: { type: [activitySchema], default: [], validate: [(items) => items.length <= 100, "Project activity keeps the latest 100 updates."] },
  status: { type: String, enum: ["open", "full", "closed", "completed"], default: "open", index: true },
}, { timestamps: true });

collaborationProjectSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.CollaborationProject || mongoose.model("CollaborationProject", collaborationProjectSchema);
