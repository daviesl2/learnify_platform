"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useAccessibility } from "@/providers/enhanced-accessibility-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DyslexiaFriendlyText } from "@/components/dyslexia-friendly-text"
import { TextToSpeech } from "@/components/text-to-speech"
import { Mic, MicOff, Volume2, VolumeX, Settings, List, Check } from "lucide-react"

interface VoiceCommandInterfaceProps {
  onCommand?: (command: string) => void
  onTranscript?: (transcript: string) => void
  commands?: Record<string, string>
  isListening?: boolean
  autoStart?: boolean
  showTranscript?: boolean
  showCommands?: boolean
}

export function VoiceCommandInterface({
  onCommand,
  onTranscript,
  commands = {},
  isListening: externalIsListening,
  autoStart = false,
  showTranscript = true,
  showCommands = true
}: VoiceCommandInterfaceProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { settings, updateSettings } = useAccessibility()
  
  const [isListening, setIsListening] = useState(autoStart)
  const [transcript, setTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [confidence, setConfidence] = useState(0)
  const [availableCommands, setAvailableCommands] = useState<Record<string, string>>(commands)
  const [recentCommands, setRecentCommands] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState("transcript")
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const recognitionRef = useRef<any>(null)
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null)

  // Use external isListening state if provided
  useEffect(() => {
    if (externalIsListening !== undefined) {
      setIsListening(externalIsListening)
    }
  }, [externalIsListening])

  // Initialize speech recognition
  useEffect(() => {
    // Check if browser supports speech recognition
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError("Speech recognition is not supported in this browser.")
      return
    }

    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    recognitionRef.current = new SpeechRecognition()
    
    recognitionRef.current.continuous = true
    recognitionRef.current.interimResults = true
    recognitionRef.current.lang = 'en-US'

    // Initialize speech synthesis
    speechSynthesisRef.current = window.speechSynthesis

    // Load default commands if none provided
    if (Object.keys(commands).length === 0) {
      fetchDefaultCommands()
    } else {
      setAvailableCommands(commands)
    }

    // Start listening if autoStart is true
    if (autoStart) {
      startListening()
    }

    // Cleanup
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      
      if (speechSynthesisRef.current && speechSynthesisRef.current.speaking) {
        speechSynthesisRef.current.cancel()
      }
    }
  }, [])

  // Handle speech recognition results
  useEffect(() => {
    if (!recognitionRef.current) return

    const handleResult = (event: any) => {
      let interimTranscript = ''
      let finalTranscript = ''
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript
          setConfidence(event.results[i][0].confidence * 100)
        } else {
          interimTranscript += transcript
        }
      }
      
      if (finalTranscript) {
        setTranscript(prevTranscript => prevTranscript + finalTranscript + ' ')
        
        if (onTranscript) {
          onTranscript(finalTranscript)
        }
        
        // Check for commands
        checkForCommands(finalTranscript.toLowerCase().trim())
      }
      
      setInterimTranscript(interimTranscript)
    }

    const handleEnd = () => {
      // Restart if still in listening mode
      if (isListening) {
        recognitionRef.current.start()
      }
    }

    const handleError = (event: any) => {
      console.error("Speech recognition error:", event.error)
      setError(`Speech recognition error: ${event.error}`)
      setIsListening(false)
    }

    recognitionRef.current.onresult = handleResult
    recognitionRef.current.onend = handleEnd
    recognitionRef.current.onerror = handleError

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null
        recognitionRef.current.onend = null
        recognitionRef.current.onerror = null
      }
    }
  }, [isListening, onTranscript])

  const fetchDefaultCommands = async () => {
    try {
      const response = await fetch('/api/voice/commands')
      const data = await response.json()
      
      if (data.success) {
        setAvailableCommands(data.commands)
      }
    } catch (error) {
      console.error("Error fetching commands:", error)
    }
  }

  const startListening = () => {
    if (!recognitionRef.current) return
    
    try {
      recognitionRef.current.start()
      setIsListening(true)
      setError(null)
    } catch (error) {
      console.error("Error starting speech recognition:", error)
      setError("Error starting speech recognition. Please try again.")
    }
  }

  const stopListening = () => {
    if (!recognitionRef.current) return
    
    try {
      recognitionRef.current.stop()
      setIsListening(false)
    } catch (error) {
      console.error("Error stopping speech recognition:", error)
    }
  }

  const toggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  const clearTranscript = () => {
    setTranscript("")
    setInterimTranscript("")
  }

  const checkForCommands = (text: string) => {
    // Check for exact command matches
    for (const [command, action] of Object.entries(availableCommands)) {
      if (text.includes(command.toLowerCase())) {
        executeCommand(command, action)
        return
      }
    }
    
    // Check for fuzzy matches
    for (const [command, action] of Object.entries(availableCommands)) {
      // Simple fuzzy matching - check if most words in the command are in the text
      const commandWords = command.toLowerCase().split(' ')
      const matchCount = commandWords.filter(word => text.includes(word)).length
      
      if (matchCount >= commandWords.length * 0.7) { // 70% match threshold
        executeCommand(command, action)
        return
      }
    }
  }

  const executeCommand = (command: string, action: string) => {
    console.log(`Executing command: ${command} -> ${action}`)
    
    // Add to recent commands
    setRecentCommands(prev => [command, ...prev.slice(0, 4)])
    
    // Provide feedback
    speak(`Executing command: ${command}`)
    
    // Execute the command
    if (onCommand) {
      onCommand(command)
    }
    
    // Handle navigation commands
    if (action.startsWith('/')) {
      router.push(action)
      return
    }
    
    // Handle special commands
    switch (action) {
      case 'NEXT':
        // Simulate next button click
        document.querySelector('[aria-label="Next"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        break
      case 'PREVIOUS':
        // Simulate previous button click
        document.querySelector('[aria-label="Previous"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        break
      case 'SUBMIT':
        // Simulate form submission
        const form = document.querySelector('form')
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
        }
        break
      case 'TOGGLE_TEXT_TO_SPEECH':
        updateSettings({ textToSpeechEnabled: !settings.textToSpeechEnabled })
        break
      case 'TOGGLE_DYSLEXIA_FONT':
        updateSettings({ dyslexiaFont: !settings.dyslexiaFont })
        break
      case 'TOGGLE_HIGH_CONTRAST':
        updateSettings({ highContrast: !settings.highContrast })
        break
      default:
        // Try to execute as JavaScript if it's a function call
        if (action.includes('(') && action.includes(')')) {
          try {
            // eslint-disable-next-line no-eval
            eval(action)
          } catch (error) {
            console.error("Error executing command action:", error)
          }
        }
    }
  }

  const speak = (text: string) => {
    if (!speechSynthesisRef.current) return
    
    // Cancel any ongoing speech
    if (speechSynthesisRef.current.speaking) {
      speechSynthesisRef.current.cancel()
    }
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event)
      setIsSpeaking(false)
    }
    
    speechSynthesisRef.current.speak(utterance)
  }

  const getConfidenceColor = () => {
    if (confidence >= 80) return "text-green-500"
    if (confidence >= 60) return "text-yellow-500"
    return "text-red-500"
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <CardTitle className={settings.dyslexiaFont ? "font-dyslexic" : ""}>
              Voice Interface
              {settings.textToSpeechEnabled && <TextToSpeech text="Voice Interface" />}
            </CardTitle>
            <CardDescription className={settings.dyslexiaFont ? "font-dyslexic" : ""}>
              <DyslexiaFriendlyText>
                Control the application using voice commands
              </DyslexiaFriendlyText>
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant={isListening ? "default" : "outline"} 
              size="sm"
              onClick={toggleListening}
              className="flex items-center gap-1"
            >
              {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              {isListening ? "Listening" : "Start Listening"}
            </Button>
            
            <Button 
              variant={settings.textToSpeechEnabled ? "default" : "outline"} 
              size="sm"
              onClick={() => updateSettings({ textToSpeechEnabled: !settings.textToSpeechEnabled })}
              className="flex items-center gap-1"
            >
              {settings.textToSpeechEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              {settings.textToSpeechEnabled ? "TTS On" : "TTS Off"}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
            <p className={settings.dyslexiaFont ? "font-dyslexic" : ""}>{error}</p>
          </div>
        )}
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="transcript" className="flex items-center gap-1">
              <Mic className="h-4 w-4" />
              <span>Transcript</span>
            </TabsTrigger>
            <TabsTrigger value="commands" className="flex items-center gap-1">
              <List className="h-4 w-4" />
              <span>Commands</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="transcript" className="space-y-4 pt-4">
            {showTranscript && (
              <div className="relative">
                <div className="border rounded-md p-4 min-h-[150px] max-h-[300px] overflow-y-auto">
                  {transcript ? (
                    <p className={settings.dyslexiaFont ? "font-dyslexic" : ""}>
                      {transcript}
                      <span className="text-muted-foreground">{interimTranscript}</span>
                    </p>
                  ) : (
                    <p className="text-muted-foreground">
                      {isListening ? "Listening... Speak now." : "Click 'Start Listening' to begin."}
                    </p>
                  )}
                </div>
                
                {isListening && (
                  <div className="absolute bottom-2 right-2 flex items-center gap-2">
                    <span className="animate-pulse h-2 w-2 rounded-full bg-green-500"></span>
                    <span className={`text-xs ${getConfidenceColor()}`}>
                      {confidence > 0 ? `${Math.round(confidence)}%` : ""}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between mt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearTranscript}
                    disabled={!transcript && !interimTranscript}
                  >
                    Clear Transcript
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => speak(transcript)}
                    disabled={!transcript || isSpeaking}
                  >
                    Read Transcript
                  </Button>
                </div>
              </div>
            )}
            
            <div>
              <h3 className={`text-sm font-medium mb-2 ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                Recent Commands
              </h3>
              
              {recentCommands.length > 0 ? (
                <div className="space-y-2">
                  {recentCommands.map((command, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className={settings.dyslexiaFont ? "font-dyslexic" : ""}>{command}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No commands executed yet.
                </p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="commands" className="space-y-4 pt-4">
            {showCommands && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`text-sm font-medium ${settings.dyslexiaFont ? "font-dyslexic" : ""}`}>
                    Available Voice Commands
                  </h3>

                  <Button
                    variant="outline"
                    size="sm"\
                    onClick={() => speak("Available commands: \" + Object.keys(availableCommands).join(', \')))}

