const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { randomUUID } = require('crypto');
const { matchesMediaHeader } = require('../utils/media');
const { validWindow } = require('../utils/validation');
const auth = require('../middleware/auth');
const Ad = require('../models/Ad');
const Device = require('../models/Device');
const Rental = require('../models/Rental');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => { const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp', 'video/mp4': '.mp4', 'video/webm': '.webm' }[file.mimetype]; cb(null, 'ad_' + randomUUID() + ext); },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/webm'].includes(file.mimetype);
    cb(ok ? null : new Error('Only images/videos allowed'), ok);
  },
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.post('/upload', auth, upload.single('file'), async (req, res) => {
  let saved = false;
  try {
    if (!req.file) return res.status(400).json({ msg: 'File required' });
    if (!await matchesMediaHeader(req.file)) return res.status(400).json({ msg: 'File contents do not match the selected image or video format' });
    const { adName, deviceId, rentalId, startTime, endTime } = req.body;
    if (!adName || !deviceId || !rentalId || !startTime || !endTime) return res.status(400).json({ msg: 'All fields required' });

    const adStart = new Date(startTime);
    const adEnd   = new Date(endTime);

    if (!validWindow(adStart, adEnd)) return res.status(400).json({ msg: 'Ad end time must be after start time' });

    // Verify the buyer owns an active rental for this exact device.
    if (rentalId) {
      const rental = await Rental.findOne({ _id: rentalId, buyer: req.user.id, device: deviceId, status: 'active' });
      if (!rental) return res.status(404).json({ msg: 'Rental not found' });

      if (adStart < rental.startDate) {
        return res.status(400).json({
          msg: 'Ad start time cannot be before your rental starts (' + rental.startDate.toLocaleString() + ')'
        });
      }
      if (adEnd > rental.endDate) {
        return res.status(400).json({
          msg: 'Ad end time cannot be after your rental ends (' + rental.endDate.toLocaleString() + ')'
        });
      }
    }

    const fileType = req.file.mimetype.startsWith('video') ? 'video' : 'image';
    const ad = await Ad.create({
      adName, fileUrl: '/uploads/' + req.file.filename, fileType,
      device: deviceId, rental: rentalId || undefined,
      uploadedBy: req.user.id, startTime: adStart, endTime: adEnd
    });
    saved = true;
    const io = req.app.get('io');
    if (io) { const pop = await Ad.findById(ad._id).populate('device','deviceName'); io.to(deviceId).emit('ad-scheduled', pop); }
    res.status(201).json(ad);
  } catch (err) { res.status(500).json({ msg: 'Upload failed' }); }
  finally {
    if (req.file && !saved) await fs.promises.unlink(req.file.path).catch(() => {});
  }
});

// DELETE /api/ads/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const ad = await Ad.findOne({ _id: req.params.id, uploadedBy: req.user.id });
    if (!ad) return res.status(404).json({ msg: 'Ad not found or unauthorized' });
    const filePath = path.join(__dirname, '..', ad.fileUrl);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    const deviceId = ad.device.toString();
    await ad.deleteOne();
    const io = req.app.get('io');
    if (io) io.to(deviceId).emit('ad-deleted', { adId: req.params.id });
    res.json({ msg: 'Ad deleted successfully' });
  } catch (err) { console.error(err); res.status(500).json({ msg: 'Server error' }); }
});

router.get('/buyer', auth, async (req, res) => {
  try {
    const ads = await Ad.find({ uploadedBy: req.user.id }).populate('device','deviceName location').sort('-createdAt');
    res.json(ads);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

router.get('/seller', auth, async (req, res) => {
  try {
    const myDevices = await Device.find({ owner: req.user.id }).select('_id');
    const ads = await Ad.find({ device: { $in: myDevices.map(d => d._id) } })
      .populate('device','deviceName location').populate('uploadedBy','name email').sort('-createdAt');
    res.json(ads);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

router.get('/device/:deviceId', async (req, res) => {
  try {
    const rentals = await Rental.find({ device: req.params.deviceId, status: 'active' }).select('_id');
    const ads = await Ad.find({ device: req.params.deviceId, rental: { $in: rentals.map(r => r._id) }, endTime: { $gte: new Date() } })
      .populate('uploadedBy','name').sort('startTime');
    res.json(ads);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === 'Only images/videos allowed') {
    return res.status(400).json({ msg: err.code === 'LIMIT_FILE_SIZE' ? 'File must be no larger than 50 MB' : err.message });
  }
  return next(err);
});
module.exports = router;
