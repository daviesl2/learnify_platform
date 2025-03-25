// app/api/iot-stem/simulator/route.ts
import { type NextRequest, NextResponse } from "next/server"

// Function to generate a random number within a range
function getRandomNumber(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

// Function to generate simulated sensor data
function generateSensorData() {
  return {
    temperature: getRandomNumber(20, 30), // Temperature in Celsius
    humidity: getRandomNumber(40, 60), // Humidity percentage
    pressure: getRandomNumber(1000, 1010), // Pressure in hPa
    light: getRandomNumber(500, 1000), // Light intensity in Lux
    soilMoisture: getRandomNumber(20, 80), // Soil moisture percentage
  }
}

export async function GET(request: NextRequest) {
  try {
    const sensorData = generateSensorData()
    return NextResponse.json(
      { data: sensorData, message: "Simulated sensor data generated successfully" },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error generating sensor data:", error)
    return NextResponse.json({ error: "Failed to generate sensor data" }, { status: 500 })
  }
}

