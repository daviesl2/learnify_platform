"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Clock, Rocket, Target, Users } from "lucide-react"

// Project interface
interface Project {
  id: string
  title: string
  description: string
  difficulty: "beginner" | "intermediate" | "advanced"
  duration: string
  subjects: string[]
  objectives: string[]
  materials: string[]
  steps: {
    id: string
    title: string
    description: string
    subjectFocus: string
    completed: boolean
  }[]
  extensions: string[]
  reflectionQuestions: string[]
}

// Sample project data
const sampleProject: Project = {
  id: "eco-city-design",
  title: "Design an Eco-Friendly City",
  description:
    "In this project, you'll design a sustainable city of the future that addresses environmental challenges while meeting the needs of its citizens.",
  difficulty: "intermediate",
  duration: "3-4 hours",
  subjects: ["Science", "Maths", "Geography", "Art"],
  objectives: [
    "Apply mathematical concepts to calculate energy usage and efficiency",
    "Understand renewable energy sources and their environmental impact",
    "Use geographical knowledge to plan city layouts based on natural features",
    "Apply creative design skills to visualize sustainable architecture",
  ],
  materials: [
    "Graph paper or digital design tool",
    "Colored pencils/markers",
    "Calculator",
    "Reference materials on renewable energy",
  ],
  steps: [
    {
      id: "step-1",
      title: "Research sustainable city features",
      description: "Investigate existing eco-friendly cities and identify key features that make them sustainable.",
      subjectFocus: "Geography",
      completed: false,
    },
    {
      id: "step-2",
      title: "Calculate energy requirements",
      description:
        "Determine the energy needs of your city based on population size and use mathematical formulas to calculate how much renewable energy you'll need to generate.",
      subjectFocus: "Maths",
      completed: false,
    },
    {
      id: "step-3",
      title: "Design renewable energy systems",
      description:
        "Select appropriate renewable energy sources for your city's location and climate, explaining the science behind how each works.",
      subjectFocus: "Science",
      completed: false,
    },
    {
      id: "step-4",
      title: "Create city layout",
      description:
        "Design your city layout considering geographical features, energy distribution, and sustainable transportation networks.",
      subjectFocus: "Geography",
      completed: false,
    },
    {
      id: "step-5",
      title: "Visualize key buildings",
      description:
        "Create detailed designs for key buildings in your city that showcase sustainable architecture principles.",
      subjectFocus: "Art",
      completed: false,
    },
  ],
  extensions: [
    "Create a 3D model of your eco-city",
    "Develop a presentation explaining how your city addresses climate change",
    "Write a day-in-the-life story of a citizen in your eco-city",
  ],
  reflectionQuestions: [
    "How does your city design balance environmental needs with human comfort?",
    "What mathematical concepts were most useful in planning your city's energy systems?",
    "How did your understanding of geography influence your city layout?",
    "What was the most challenging aspect of integrating multiple subjects in this project?",
  ],
}

export default function InterdisciplinaryProject() {
  const [project, setProject] = useState<Project>(sampleProject)
  const [activeTab, setActiveTab] = useState('overview')
  
  // Calculate project completion percentage
  const completedSteps = project.steps.filter(step => step.completed).length
  const completionPercentage = (completedSteps / project.steps.length) * 100
  
  // Toggle step completion
  const toggleStepCompletion = (stepId: string) => {
    setProject(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === stepId ? { ...step, completed: !step.completed } : step
      )
    }))
  }
  
  // Get difficulty color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800'
      case 'intermediate':
        return 'bg-blue-100 text-blue-800'
      case 'advanced':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }
  
  // Get subject badge variant
  const getSubjectVariant = (subject: string) => {
    switch (subject) {
      case 'Maths':
        return 'default'
      case 'Science':
        return 'secondary'
      case 'Geography':
        return 'outline'
      case 'Art':
        return 'destructive'
      default:
        return 'default'
    }
  }
  
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl">{project.title}</CardTitle>
            <CardDescription className="mt-2">{project.description}</CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={getDifficultyColor(project.difficulty)} variant="outline">
              {project.difficulty.charAt(0).toUpperCase() + project.difficulty.slice(1)}
            </Badge>
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="mr-1 h-4 w-4" />
              {project.duration}
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-4">
          {project.subjects.map((subject, index) => (
            <Badge key={index} variant={getSubjectVariant(subject) as any}>
              {subject}
            </Badge>
          ))}
        </div>
        
        <div className="mt-4">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">Project Progress</span>
            <span className="text-sm font-medium">{completedSteps}/{project.steps.length} steps</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="overview" onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="steps">Steps</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="reflection">Reflection</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div>
              <h3 className="text-lg font-medium flex items-center">
                <Target className="mr-2 h-5 w-5 text-primary" />
                Learning Objectives
              </h3>
              <ul className="mt-2 space-y-2">
                {project.objectives.map((objective, index) => (
                  <li key={index} className="flex items-start">
                    <div className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center mr-2 mt-0.5 text-xs">
                      {index + 1}
                    </div>
                    <span>{objective}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="text-lg font-medium flex items-center">
                <Rocket className="mr-2 h-5 w-5 text-primary" />
                Extension Activities
              </h3>
              <ul className="mt-2 space-y-2">
                {project.extensions.map((extension, index) => (
                  <li key={index} className="flex items-start">
                    <div className="bg-primary/10 text-primary rounded-full w-5 h-5 flex items-center justify-center mr-2 mt-0.5 text-xs">
                      {index + 1}
                    </div>
                    <span>{extension}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="text-lg font-medium flex items-center">
                <Users className="mr-2 h-5 w-5 text-primary" />
                Collaboration Tips
              </h3>
              <div className="mt-2 p-4 bg-muted rounded-lg">
                <p>This project works well in groups of 3-4 students. Consider assigning different roles:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Project Manager - keeps track of progress and deadlines</li>
                  <li>Research Specialist - gathers information on sustainable features</li>
                  <li>Design Lead - coordinates the visual aspects of the city</li>
                  <li>Technical Expert - handles calculations and scientific aspects</li>
\

