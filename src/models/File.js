const mongoose = require('mongoose');

// =========================================================
// REPLACEABLE: File Schema Definition
// =========================================================
// This schema tracks file metadata. The actual files might be stored
// in cloud storage (AWS S3, Firebase) or local disk.
// This schema should store the reference/URL to that storage.
// =========================================================

const fileSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String, // e.g., 'image/png', 'application/pdf'
      required: true,
    },
    size: {
      type: Number, // in bytes
      required: true,
    },
    url: {
      type: String, // URL to access the file (S3, Cloudinary, etc.)
      required: false, // Not required for folders
    },
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File', // Self-referencing for nested folders
      default: null,
    },
    isStarred: {
      type: Boolean,
      default: false,
    },
     isTrashed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const File = mongoose.model('File', fileSchema);

module.exports = File;
