import { getStudentProfile } from "@/lib/getStudentProfile";

export async function POST(req: Request) {
  const body = await req.json();
  const studentId = body.studentId || "default-student";

  const profile = await getStudentProfile(studentId);

  const lesson = `🧠 Custom AI Lesson for ${profile.name} (${profile.year})\n\nFocus Areas: ${profile.weakAreas.join(", ")}\n\nObjective: Help the student improve in weak topics.\n\nStep 1: Intro to ${profile.weakAreas[0]}\nStep 2: Practice questions\nStep 3: Mini quiz`;

  return new Response(JSON.stringify({ lesson }), {
    headers: { "Content-Type": "application/json" },
  });
}
