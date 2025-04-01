import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma'; // ✅ Default import
import { differenceInCalendarDays } from 'date-fns';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ✅ Optional: Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    console.log('🔥 XP API HIT');

    const { userId } = req.body;
    console.log('🧠 userId received:', userId);

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      console.log('❌ User not found');
      return res.status(404).json({ message: 'User not found' });
    }

    const today = new Date();
    const lastActive = user.lastActive ?? new Date(0);
    const daysDiff = differenceInCalendarDays(today, lastActive);

    const streak = daysDiff === 1 ? user.streak + 1 : 1;
    const bonusXP = streak >= 5 ? 5 : 0;
    const xpGain = 10 + bonusXP;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        xp: user.xp + xpGain,
        streak,
        lastActive: today,
      },
    });

    console.log('✅ XP Updated:', updatedUser);

    const badgeMilestones = [5, 10, 20];
    if (badgeMilestones.includes(streak)) {
      const badge = await prisma.badge.create({
        data: {
          label: `${streak}-Day Streak`,
          userId,
        },
      });
      console.log('🏅 Badge awarded:', badge.label);
    }

    return res.status(200).json({ message: 'XP awarded', user: updatedUser });
  } catch (error: any) {
    console.error('💥 API ERROR:', JSON.stringify(error, null, 2));
    console.error('💥 RAW ERROR:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
