const File = require('../models/File');
const path = require('path');
const fs = require('fs');

// @desc    Upload file(s) and create metadata
// @route   POST /api/file/upload
// @access  Private
const uploadFile = async (req, res) => {
  try {



    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ msg: 'No files uploaded' });
    }

    const createdFiles = [];

    for (const file of req.files) {
      const relativePath = `/uploads/${file.filename}`;

      const newFile = new File({
        user: req.user._id,
        name: file.originalname,
        type: file.mimetype,
        size: file.size,
        url: relativePath,
        folderId: req.body.folderId || null,
      });

      const savedFile = await newFile.save();
      createdFiles.push(savedFile);
    }

    res.status(201).json({
      message: 'Files uploaded successfully',
      files: createdFiles
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Server Error during upload', error: error.message });
  }
};

// @desc    Create a folder
// @route   POST /api/file/folder
// @access  Private
const createFolder = async (req, res) => {
  try {
    const { name, folderId } = req.body;

    const newFolder = new File({
      user: req.user._id,
      name,
      type: 'folder',
      size: 0,
      url: '', 
      folderId: folderId || null,
      isStarred: false,
    });

    const createdFolder = await newFolder.save();
    res.status(201).json(createdFolder);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

// @desc    Get all active files (not in trash)
// @route   GET /api/file
// @access  Private
const getFiles = async (req, res) => {
  try {
    // Only fetch files that are NOT in trash
    // Only fetch files that are NOT in trash
    const folderId = req.query.folderId || null;
    const searchQuery = req.query.search;
    
    let query = { 
      user: req.user._id, 
      isTrashed: false 
    };

    if (searchQuery) {
        // If searching, we might want to search across all folders or just current?
        // Usually search searches everything.
        // If folderId is provided AND search is provided, should we search inside folder? 
        // Let's assume global search if search is present, OR strict scoping.
        // For now, let's keep folder hierarchy if folderId is explicit, but if searching from root (folderId=null), maybe search all?
        // User request: "make search feature works".
        // Let's make it simple: If search is present, ignore folderId and search all files? 
        // Or strictly filter. 
        // UX Pattern: Search usually searches *everything*.
        query.name = { $regex: searchQuery, $options: 'i' };
    } else {
        // Only apply folder filter if NOT searching (or if we want scoped search)
        // If we want scoped search: query.folderId = folderId;
        // If we want global search: don't set folderId if search is present.
        query.folderId = folderId;
    }

    const files = await File.find(query).sort({ createdAt: -1 });

    // Calculate child counts for folders
    // Calculate child counts for folders
    const filesWithCounts = await Promise.all(files.map(async (file) => {
        let fileObj = file.toObject();
        if (file.type === 'folder') {
            const count = await File.countDocuments({ 
                folderId: file._id, 
                user: req.user._id,
                isTrashed: false 
            });
            fileObj.childCount = count;
        }
        return fileObj;
    }));

    res.json(filesWithCounts);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

// @desc    Get trashed files
// @route   GET /api/file/trash
// @access  Private
const getTrashFiles = async (req, res) => {
  try {
    const files = await File.find({ user: req.user._id, isTrashed: true }).sort({ updatedAt: -1 });
    res.json(files);
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

// @desc    Soft delete a file (Move to Trash)
// @route   DELETE /api/file/:id
// @access  Private
const deleteFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);

    if (file) {
      if (file.user.toString() !== req.user._id.toString()) {
         return res.status(401).json({ msg: 'Not authorized' });
      }
      
      // Soft Delete
      file.isTrashed = true;
      await file.save();

      res.json({ msg: 'File moved to trash' });
    } else {
      res.status(404).json({ msg: 'File not found' });
    }
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

// @desc    Restore file from Trash
// @route   PUT /api/file/restore/:id
// @access  Private
const restoreFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);

    if (file) {
      if (file.user.toString() !== req.user._id.toString()) {
         return res.status(401).json({ msg: 'Not authorized' });
      }
      
      file.isTrashed = false;
      await file.save();

      res.json({ msg: 'File restored' });
    } else {
      res.status(404).json({ msg: 'File not found' });
    }
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

// @desc    Permanently delete file
// @route   DELETE /api/file/permanent/:id
// @access  Private
const permanentDeleteFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);

    if (file) {
      if (file.user.toString() !== req.user._id.toString()) {
         return res.status(401).json({ msg: 'Not authorized' });
      }
      
      // Delete from local storage if it's a file
      if (file.url && file.type !== 'folder') {
        const filePath = path.join(__dirname, '../../', file.url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      await file.deleteOne(); 
      res.json({ msg: 'File permanently deleted' });
    } else {
      res.status(404).json({ msg: 'File not found' });
    }
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

// @desc    Move file/folder to another folder
// @route   PUT /api/file/move/:id
// @access  Private
const moveFile = async (req, res) => {
  try {
    const { folderId } = req.body; // New parent folder ID (or null for root)
    const file = await File.findById(req.params.id);

    if (file) {
      if (file.user.toString() !== req.user._id.toString()) {
         return res.status(401).json({ msg: 'Not authorized' });
      }
      
      // Prevent moving folder into itself or its children (basic check)
      if (file.type === 'folder' && file._id.toString() === folderId) {
        return res.status(400).json({ msg: 'Cannot move folder into itself' });
      }

      file.folderId = folderId || null;
      await file.save();

      res.json({ msg: 'File moved successfully', file });
    } else {
      res.status(404).json({ msg: 'File not found' });
    }
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

// @desc    Bulk move files/folders
// @route   POST /api/file/bulk/move
// @access  Private
const bulkMoveFiles = async (req, res) => {
  try {
    const { fileIds, folderId } = req.body;
    if (!fileIds || !Array.isArray(fileIds)) return res.status(400).json({msg: 'Invalid request'});

    await File.updateMany(
      { _id: { $in: fileIds }, user: req.user._id, isTrashed: false },
      { $set: { folderId: folderId || null } }
    );

    res.json({ msg: 'Files moved successfully' });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

// @desc    Bulk soft delete (Move to Trash)
// @route   POST /api/file/bulk/delete
// @access  Private
const bulkDeleteFiles = async (req, res) => {
  try {
    const { fileIds } = req.body;
    if (!fileIds || !Array.isArray(fileIds)) return res.status(400).json({msg: 'Invalid request'});

    await File.updateMany(
      { _id: { $in: fileIds }, user: req.user._id },
      { $set: { isTrashed: true } }
    );

    res.json({ msg: 'Files moved to trash' });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

// @desc    Bulk restore files from Trash
// @route   POST /api/file/bulk/restore
// @access  Private
const bulkRestoreFiles = async (req, res) => {
  try {
    const { fileIds } = req.body;
    if (!fileIds || !Array.isArray(fileIds)) return res.status(400).json({msg: 'Invalid request'});

    await File.updateMany(
      { _id: { $in: fileIds }, user: req.user._id },
      { $set: { isTrashed: false } }
    );

    res.json({ msg: 'Files restored' });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

// @desc    Bulk permanently delete files
// @route   POST /api/file/bulk/permanent
// @access  Private
const bulkPermanentDeleteFiles = async (req, res) => {
  try {
    const { fileIds } = req.body;
    if (!fileIds || !Array.isArray(fileIds)) return res.status(400).json({msg: 'Invalid request'});

    const files = await File.find({ _id: { $in: fileIds }, user: req.user._id });

    for (const file of files) {
      if (file.url && file.type !== 'folder') {
        const filePath = path.join(__dirname, '../../', file.url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    await File.deleteMany({ _id: { $in: fileIds }, user: req.user._id });
    res.json({ msg: 'Files permanently deleted' });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

module.exports = {
  getFiles,
  uploadFile,
  createFolder,
  deleteFile, // Soft Delete
  getTrashFiles,
  restoreFile,
  permanentDeleteFile,
  moveFile,
  bulkDeleteFiles,
  bulkMoveFiles,
  bulkRestoreFiles,
  bulkPermanentDeleteFiles
};
