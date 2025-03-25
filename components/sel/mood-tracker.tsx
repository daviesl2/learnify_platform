"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { SmilePlus, Smile, Meh, Frown, FrownIcon as FrownPlus, CalendarIcon, BarChart } from "lucide-react"

interface MoodEntry {
  id: string
  mood: string
  intensity: number
  notes?: string
  createdAt: string
}

interface MoodTrackerProps {
  userId: string
  initialEntries?: MoodEntry[]
  onMoodSubmit?: (mood: string, intensity: number, notes?: string) => Promise<void>
}

const MOODS = [
  { value: "very_happy", label: "Very Happy", icon: SmilePlus, color: "text-green-500" },
  { value: "happy", label: "Happy", icon: Smile, color: "text-emerald-500" },
  { value: "neutral", label: "Neutral", icon: Meh, color: "text-blue-500" },
  { value: "sad", label: "Sad", icon: Frown, color: "text-amber-500" },
  { value: "very_sad", label: "Very Sad", icon: FrownPlus, color: "text-red-500" },
]

export function MoodTracker({ userId, initialEntries = [], onMoodSubmit }: MoodTrackerProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("today")
  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [entries, setEntries] = useState<MoodEntry[]>(initialEntries)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

  // Fetch mood entries for the selected date
  useEffect(() => {
    if (activeTab === "history" && selectedDate) {
      fetchMoodEntries(format(selectedDate, "yyyy-MM-dd"))
    }
  }, [activeTab, selectedDate])

  const fetchMoodEntries = async (date: string) => {
    try {
      const response = await fetch(`/api/sel/moods?date=${date}`)
      const data = await response.json()

      if (data.entries) {
        setEntries(data.entries)
      }
    } catch (error) {
      console.error("Error fetching mood entries:", error)
    }
  }

  const handleMoodSelect = (mood: string) => {
    setSelectedMood(mood)
  }

  const handleSubmit = async () => {
    if (!selectedMood) return

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/sel/moods", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mood: selectedMood,
          intensity: getMoodIntensity(selectedMood),
          notes: notes.trim() || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit mood")
      }

      const data = await response.json()

      // Add the new entry to the list
      setEntries([data.entry, ...entries])

      // Reset form
      setSelectedMood(null)
      setNotes("")

      // Call the onMoodSubmit callback if provided
      if (onMoodSubmit) {
        await onMoodSubmit(selectedMood, getMoodIntensity(selectedMood), notes.trim() || undefined)
      }

      // Refresh the page to show the new entry
      router.refresh()
    } catch (error) {
      console.error("Error submitting mood:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getMoodIntensity = (mood: string): number => {
    switch (mood) {
      case "very_happy":
        return 5
      case "happy":
        return 4
      case "neutral":
        return 3
      case "sad":
        return 2
      case "very_sad":
        return 1
      default:
        return 3
    }
  }

  const getMoodIcon = (mood: string) => {
    const moodObj = MOODS.find((m) => m.value === mood)
    if (!moodObj) return null

    const Icon = moodObj.icon
    return <Icon className={`h-6 w-6 ${moodObj.color}`} />
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Mood Tracker</CardTitle>
        <CardDescription>Track how you're feeling today and see your mood history</CardDescription>
      </CardHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="today">Today's Mood</TabsTrigger>
          <TabsTrigger value="history">Mood History</TabsTrigger>
        </TabsList>

        <TabsContent value="today">
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-5 gap-2">
              {MOODS.map((mood) => {
                const Icon = mood.icon
                const isSelected = selectedMood === mood.value

                return (
                  <Button
                    key={mood.value}
                    variant={isSelected ? "default" : "outline"}
                    className={`flex flex-col items-center justify-center h-24 p-2 ${isSelected ? "bg-primary" : ""}`}
                    onClick={() => handleMoodSelect(mood.value)}
                  >
                    <Icon className={`h-8 w-8 mb-2 ${isSelected ? "text-primary-foreground" : mood.color}`} />
                    <span className={`text-xs text-center ${isSelected ? "text-primary-foreground" : ""}`}>
                      {mood.label}
                    </span>
                  </Button>
                )
              })}
            </div>

            {selectedMood && (
              <div className="space-y-2">
                <label htmlFor="notes" className="text-sm font-medium">
                  Add notes (optional)
                </label>
                <Textarea
                  id="notes"
                  placeholder="How are you feeling today? What made you feel this way?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            )}
          </CardContent>

          <CardFooter>
            <Button onClick={handleSubmit} disabled={!selectedMood || isSubmitting} className="w-full">
              {isSubmitting ? "Saving..." : "Save Mood"}
            </Button>
          </CardFooter>
        </TabsContent>

        <TabsContent value="history">
          <CardContent className="pt-4 space-y-4">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Select Date</label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="border rounded-md p-2"
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">
                Moods for {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Today"}
              </h3>

              {entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No mood entries for this date.</p>
              ) : (
                <div className="space-y-2">
                  {entries.map((entry) => (
                    <div key={entry.id} className="flex items-center p-3 border rounded-md">
                      <div className="mr-3">{getMoodIcon(entry.mood)}</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {MOODS.find((m) => m.value === entry.mood)?.label || "Unknown"}
                        </p>
                        {entry.notes && <p className="text-xs text-muted-foreground">{entry.notes}</p>}
                      </div>
                      <div className="text-xs text-muted-foreground">{format(new Date(entry.createdAt), "h:mm a")}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => router.push("/dashboard/mood-analytics")}>
              <BarChart className="h-4 w-4 mr-2" />
              View Analytics
            </Button>
            <Button variant="outline" onClick={() => router.push("/dashboard/mood-calendar")}>
              <CalendarIcon className="h-4 w-4 mr-2" />
              Monthly View
            </Button>
          </CardFooter>
        </TabsContent>
      </Tabs>
    </Card>
  )
}

