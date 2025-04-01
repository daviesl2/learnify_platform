import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const { studentId, xpGained } = await req.json();

  try {
    const updated = await prisma.student.update({
      where: { id: studentId },
      data: {
        xp: {
          increment: xpGained,
        },
      },
    });

    return new Response(JSON.stringify({ success: true, newXP: updated.xp }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("XP Update Error:", err);
    return new Response(JSON.stringify({ success: false, error: err }), {
      status: 500,
    });
  }
}
