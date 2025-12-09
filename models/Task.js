const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * Task:
 * - name: "Sol" | "Cuisine" | "Douche" | "Toilettes"
 * - assignedTo: ObjectId -> User
 * - weekNumber: Number (1..53)
 * - year: Number
 * - status: "pending" | "done"
 * - proofImage: URL Cloudinary (optionnel)
 */

const TaskSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      enum: ["Sol", "Cuisine", "Douche", "Toilettes"],
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    weekNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 53,
    },
    year: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "done", "late", "missed"],
      default: "pending",
    },
    proofImage: {
      type: String,
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    doneAt: {
      type: Date,
      default: null,
    },
    note: {
      type: String,
      trim: true,
      default: null,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

// Index pour requêtes fréquentes
TaskSchema.index({ weekNumber: 1, year: 1 });
TaskSchema.index({ assignedTo: 1 });
TaskSchema.index({ name: 1, weekNumber: 1, year: 1 }, { unique: false });

// Méthode statique : récupérer les tâches d'une semaine
TaskSchema.statics.findByWeek = function (weekNumber, year) {
  return this.find({ weekNumber, year }).populate("assignedTo", "name avatarUrl");
};

// Méthode instance : marquer comme faite
TaskSchema.methods.markDone = async function (proofImageUrl = null) {
  this.status = "done";
  this.doneAt = new Date();
  if (proofImageUrl) this.proofImage = proofImageUrl;
  await this.save();
  return this;
};

module.exports = mongoose.models.Task || mongoose.model("Task", TaskSchema);
