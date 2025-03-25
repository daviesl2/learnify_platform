// app/api/projects/interdisciplinary/route.ts

import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Simulate fetching interdisciplinary projects data
    const interdisciplinaryProjects = [
      {
        id: 1,
        title: "AI-Powered Personalized Education Platform",
        description: "A platform that leverages AI to personalize learning experiences for students of all ages.",
        disciplines: ["Artificial Intelligence", "Education", "Psychology"],
        teamMembers: ["Alice Smith", "Bob Johnson", "Charlie Brown"],
        status: "In Progress",
        startDate: "2023-01-15",
        endDate: "2024-06-30",
        budget: 150000,
        fundingSource: "National Science Foundation",
        impactSummary: "Expected to improve student learning outcomes by 20% and reduce dropout rates by 10%.",
        publications: [
          {
            title: "Personalized Learning with AI: A Comprehensive Review",
            journal: "Journal of Educational Technology",
            year: 2023,
          },
        ],
      },
      {
        id: 2,
        title: "Smart City Sustainable Transportation System",
        description:
          "An integrated transportation system that optimizes traffic flow, reduces emissions, and enhances accessibility in urban environments.",
        disciplines: ["Urban Planning", "Environmental Science", "Computer Science", "Civil Engineering"],
        teamMembers: ["David Lee", "Eve Wilson", "Frank Garcia"],
        status: "Completed",
        startDate: "2020-09-01",
        endDate: "2022-12-31",
        budget: 500000,
        fundingSource: "Department of Transportation",
        impactSummary:
          "Reduced traffic congestion by 15%, lowered carbon emissions by 25%, and improved public transportation ridership by 30%.",
        publications: [
          {
            title: "Optimizing Urban Transportation with Smart Technologies",
            journal: "Transportation Research Part C: Emerging Technologies",
            year: 2022,
          },
        ],
      },
      {
        id: 3,
        title: "Bioprinting of Functional Human Tissues",
        description:
          "Developing 3D bioprinting techniques to create functional human tissues for regenerative medicine and drug testing.",
        disciplines: ["Biomedical Engineering", "Materials Science", "Biology", "Medicine"],
        teamMembers: ["Grace Chen", "Henry Moore", "Ivy Taylor"],
        status: "In Progress",
        startDate: "2022-05-01",
        endDate: "2025-12-31",
        budget: 800000,
        fundingSource: "National Institutes of Health",
        impactSummary:
          "Potential to revolutionize regenerative medicine by providing on-demand tissues and organs for transplantation.",
        publications: [
          {
            title: "3D Bioprinting: Advances and Challenges",
            journal: "Advanced Materials",
            year: 2023,
          },
        ],
      },
    ]

    // Simulate a delay to mimic network latency
    await new Promise((resolve) => setTimeout(resolve, 500))

    return NextResponse.json(interdisciplinaryProjects)
  } catch (error) {
    console.error("Error fetching interdisciplinary projects:", error)
    return new NextResponse(JSON.stringify({ message: "Failed to fetch interdisciplinary projects" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

