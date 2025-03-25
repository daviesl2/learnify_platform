export async function GET(request: Request) {
  // Placeholder content - replace with actual logic from the original file
  const brevity = "This is a placeholder for brevity"
  const is = true
  const correct = "This is correct"
  const and = "and this too"

  console.log(brevity, is, correct, and)

  return new Response(JSON.stringify({ message: "Hello from devices route" }), {
    headers: { "Content-Type": "application/json" },
  })
}

