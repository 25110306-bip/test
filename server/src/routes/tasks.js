const express = require('express');
const { z } = require('zod');
const UserTask = require('../models/UserTask');
const GoldLedger = require('../models/GoldLedger');
const { requireAuth, requireVerifiedPhone } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { asyncHandler, createError } = require('../utils/http');
const { randomTask, taskDateKey } = require('../utils/taskFactory');

const router = express.Router();

const completeSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    elapsedSeconds: z.number().int().min(0).max(3600),
    proofText: z.string().trim().min(3).max(1000)
  })
});

router.get('/today', requireAuth, requireVerifiedPhone, asyncHandler(async (req, res) => {
  const dateKey = taskDateKey();
  let task = await UserTask.findOne({ userId: req.user._id, taskDate: dateKey });
  if (!task) {
    const template = randomTask();
    task = await UserTask.create({
      userId: req.user._id,
      taskDate: dateKey,
      ...template,
      startedAt: new Date()
    });
  }
  res.json({ task });
}));

router.get('/history', requireAuth, asyncHandler(async (req, res) => {
  const tasks = await UserTask.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(30);
  res.json({ tasks });
}));

router.post('/:id/complete', requireAuth, requireVerifiedPhone, validate(completeSchema), asyncHandler(async (req, res) => {
  const task = await UserTask.findOne({ _id: req.validated.params.id, userId: req.user._id });
  if (!task) throw createError(404, 'Không tìm thấy nhiệm vụ.');
  if (task.status === 'completed') throw createError(409, 'Nhiệm vụ này đã hoàn thành.');
  if (req.validated.body.elapsedSeconds < task.minimumSeconds) {
    throw createError(400, `Bạn cần thực hiện tối thiểu ${task.minimumSeconds} giây.`);
  }

  task.status = 'completed';
  task.proofText = req.validated.body.proofText;
  task.completedAt = new Date();
  req.user.goldBalance += task.rewardGold;
  req.user.fanXp += task.rewardGold;

  const ledger = await GoldLedger.create({
    userId: req.user._id,
    type: 'earn_task',
    amount: task.rewardGold,
    balanceAfter: req.user.goldBalance,
    refModel: 'UserTask',
    refId: task._id,
    note: `Hoàn thành nhiệm vụ ${task.title}`
  });

  await Promise.all([task.save(), req.user.save()]);
  res.json({ message: `Bạn nhận được ${task.rewardGold} vàng.`, task, goldBalance: req.user.goldBalance, ledger });
}));

module.exports = router;
