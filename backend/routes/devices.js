const router = require('express').Router();
const auth = require('../middleware/auth');
const Device = require('../models/Device');

router.post('/', auth, async (req, res) => {
  try {
    const { deviceName, location, screenSize, resolution, pricePerHour, deviceId, availabilitySchedule } = req.body;
    if (!deviceName || !location || !screenSize || !resolution || !pricePerHour || !deviceId)
      return res.status(400).json({ msg: 'All fields required' });
    if (await Device.findOne({ deviceId })) return res.status(400).json({ msg: 'Device ID already used' });
    const device = new Device({ deviceName, location, screenSize, resolution, pricePerHour, deviceId, availabilitySchedule, owner: req.user.id });
    await device.save();
    res.status(201).json(device);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

router.get('/available', auth, async (req, res) => {
  try {
    const devices = await Device.find({ status: 'available' }).populate('owner', 'name email');
    res.json(devices);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

router.get('/mine', auth, async (req, res) => {
  try {
    const devices = await Device.find({ owner: req.user.id });
    res.json(devices);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const device = await Device.findById(req.params.id).populate('owner', 'name email');
    if (!device) return res.status(404).json({ msg: 'Device not found' });
    res.json(device);
  } catch (err) { res.status(500).json({ msg: 'Server error' }); }
});

module.exports = router;
