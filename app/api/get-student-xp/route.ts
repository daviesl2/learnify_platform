import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    // Step 1: Get studentId from the request body
    const { studentId } = await req.json();

    // Step 2: Check if studentId is valid
    if (!studentId) {
      return new Response(
        JSON.stringify({ success: false, error: "Student ID is required" }),
        { status: 400 }
      );
    }

    // Step 3: Query the database for the student
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    // Step 4: If the student is not found, return a 404 error
    if (!student) {
      return new Response(
        JSON.stringify({ success: false, error: "Student not found" }),
        { status: 404 }
      );
    }

    // Step 5: Return the student's XP
    return new Response(
      JSON.stringify({ success: true, currentXP: student.xp }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error fetching student XP:", err);
    // Step 6: Return a 500 error if there’s an issue with the database or API
    return new Response(
      JSON.stringify({ success: false, error: "Internal Server Error" }),
      { status: 500 }
    );
  }
}
