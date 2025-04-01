export async function getStudentProfile(studentId: string) {
    // Simulating a DB fetch for now
    return {
      id: studentId,
      name: "Jayden",
      year: "Year 5",
      weakAreas: ["Fractions", "Decimals", "Word Problems"],
    };
  }
  