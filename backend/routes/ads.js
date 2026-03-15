const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const auth = require('../middleware/auth');
const Ad = require('../models/Ad');
const Device = require('../models/Device');
const Rental = require('../models/Rental');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => { const ext = path.extname(file.originalname); cb(null, 'ad_' + Date.now() + ext); },
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
  try {
    if (!req.file) return res.status(400).json({ msg: 'File required' });
    const { adName, deviceId, rentalId, startTime, endTime } = req.body;
    if (!adName || !deviceId || !startTime || !endTime) return res.status(400).json({ msg: 'All fields required' });

    const adStart = new Date(startTime);
    const adEnd   = new Date(endTime);

    if (adEnd <= adStart) return res.status(400).json({ msg: 'Ad end time must be after start time' });

    // Validate against rental window if rentalId is provided
    if (rentalId) {
      const rental = await Rental.findOne({ _id: rentalId, buyer: req.user.id });
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
    const io = req.app.get('io');
    if (io) { const pop = await Ad.findById(ad._id).populate('device','deviceName'); io.to(deviceId).emit('ad-scheduled', pop); }
    res.status(201).json(ad);
  } catch (err) { res.status(500).json({ msg: err.message || 'Server error' }); }
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
    const ads = await Ad.find({ device: req.params.deviceId, endTime: { $gte: new Date() } })
      .populate('uploadedBy','name').sort('startTime');
    res.json(ads);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

module.exports = router;
