"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Lightbulb, X } from "lucide-react"

interface GrowthMindsetAffirmation {
  id: string
  content: string
  category: string
}

interface GrowthMindsetPopupProps {
  userId: string
  triggerAfterSeconds?: number
  onAcknowledge?: (affirmationId: string) => Promise<void>
}

export function GrowthMindsetPopup({
  userId,
  triggerAfterSeconds = 300, // Default to 5 minutes
  onAcknowledge,
}: GrowthMindsetPopupProps) {
  const [affirmation, setAffirmation] = useState<GrowthMindsetAffirmation | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [hasShownToday, setHasShownToday] = useState(false)

  // Check if we've already shown an affirmation today
  useEffect(() => {
    const lastShown = localStorage.getItem("lastAffirmationShown")

    if (lastShown) {
      const lastDate = new Date(lastShown).toDateString()
      const today = new Date().toDateString()

      if (lastDate === today) {
        setHasShownToday(true)
      }
    }
  }, [])

  // Set up timer to show affirmation
  useEffect(() => {
    if (hasShownToday) return

    const timer = setTimeout(() => {
      fetchAffirmation()
    }, triggerAfterSeconds * 1000)

    return () => clearTimeout(timer)
  }, [hasShownToday, triggerAfterSeconds])

  const fetchAffirmation = async () => {
    try {
      const response = await fetch("/api/sel/growth-mindset/daily")
      const data = await response.json()

      if (data.affirmation) {
        setAffirmation(data.affirmation)
        setIsOpen(true)

        // Record that we've shown an affirmation today
        localStorage.setItem("lastAffirmationShown", new Date().toISOString())
        setHasShownToday(true)
      }
    } catch (error) {
      console.error("Error fetching growth mindset affirmation:", error)
    }
  }

  const handleAcknowledge = async () => {
    if (!affirmation) return

    try {
      const response = await fetch("/api/sel/growth-mindset/acknowledge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          affirmationId: affirmation.id,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to acknowledge affirmation")
      }

      // Call the onAcknowledge callback if provided
      if (onAcknowledge) {
        await onAcknowledge(affirmation.id)
      }
    } catch (error) {
      console.error("Error acknowledging affirmation:", error)
    } finally {
      setIsOpen(false)
    }
  }

  // For testing purposes - allow manual trigger
  const triggerManually = () => {
    fetchAffirmation()
  }

  return (
    <>
      {/* Hidden button for testing */}
      <Button variant="outline" size="sm" onClick={triggerManually} className="hidden">
        Trigger Affirmation
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />
              Growth Mindset Moment
            </DialogTitle>
            <DialogDescription>Take a moment to reflect on this growth mindset affirmation.</DialogDescription>
          </DialogHeader>

          {affirmation && (
            <div className="py-4">
              <div className="bg-muted p-4 rounded-md mb-4">
                <p className="text-lg font-medium text-center">"{affirmation.content}"</p>
              </div>

              <div className="flex justify-center">
                <Badge variant="outline" className="capitalize">
                  {affirmation.category}
                </Badge>
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-between">
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Dismiss
            </Button>
            <Button onClick={handleAcknowledge}>I'll Remember This</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

