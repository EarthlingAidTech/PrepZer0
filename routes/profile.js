const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const router = express.Router();
const profilecontroller = require('../controllers/profilecontroller');
const { uploadProfileImage } = require('../utils/s3Uploader');

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `profile-${uuidv4()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error('Only JPG, JPEG, and PNG files are allowed'));
    }
    cb(null, true);
  }
});

router.route('/')
  .get(profilecontroller.getprofilecontrol);

router.route('/profile_edit')
  .get(profilecontroller.getprofile_editcontrol)
  .post(upload.single('image'), async (req, res, next) => {
    try {
      if (req.file) {
        const s3Url = await uploadProfileImage(req.file.path, req.file.filename);
        fs.unlinkSync(req.file.path); // delete local file
        req.body.profileImageUrl = s3Url;
      }
      await profilecontroller.profile_editcontrol(req, res);
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).send('Image upload failed');
    }
  });

router.route('/changePassword')
  .get(profilecontroller.getchangepasscontrol)
  .post(profilecontroller.changepasscontrol);

module.exports = router;
