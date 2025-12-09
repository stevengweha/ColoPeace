const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * TaskHistory keeps a simple log to prevent repetition and for audit.
 * Each entry indicates that user X had taskName on weekNumber/year (assigned or completed).
 */

const TaskHistorySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    taskName: {
      type: String,
      required: true,
      enum: ["Sol", "Cuisine", "Douche", "Toilettes"],
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
    action: {
      type: String,
      enum: ["assigned", "completed", "reassigned"],
      default: "assigned",
    },
    meta: {
      // champ libre pour stocker info (ex: image url, commentaire)
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

// Index pour rechercher rapidement l'historique d'un user sur une tâche donnée
TaskHistorySchema.index({ userId: 1, taskName: 1, year: -1, weekNumber: -1 });

module.exports = mongoose.models.TaskHistory || mongoose.model("TaskHistory", TaskHistorySchema);
