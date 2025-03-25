"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Loader2, X, UserPlus, Users } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string
  role: string
  grade?: string
  subjects?: Array<{ id: string; name: string }>
}

interface Subject {
  id: string
  name: string
}

interface MentorshipAssignmentProps {
  userId: string
  userRole: string
  subjects: Subject[]
  onCreateMentorship?: (menteeId: string, subjectId: string, goals: string) => Promise<void>
  onAcceptMentorship?: (mentorshipId: string) => Promise<void>
  onDeclineMentorship?: (mentorshipId: string) => Promise<void>
}

export function MentorshipAssignment({
  userId,
  userRole,
  subjects,
  onCreateMentorship,
  onAcceptMentorship,
  onDeclineMentorship
}: MentorshipAssignmentProps) {
  const [activeTab, setActiveTab] = useState('find')
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [activeMentorships, setActiveMentorships] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [mentorshipGoals, setMentorshipGoals] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Fetch users when search parameters change
  useEffect(() => {
    if (activeTab === 'find') {
      fetchUsers()
    }
  }, [activeTab, selectedSubject, searchQuery])
  
  // Fetch mentorship requests and active mentorships
  useEffect(() => {
    if (activeTab === 'requests' || activeTab === 'active') {
      fetchMentorships()
    }
  }, [activeTab])
  
  const fetchUsers = async () => {
    if (!searchQuery && !selectedSubject) return
    
    setIsLoading(true)
    
    try {
      let url = '/api/peer-teaching/users?'
      
      if (searchQuery) {
        url += `search=${encodeURIComponent(searchQuery)}&`
      }
      
      if (selectedSubject) {
        url += `subjectId=${selectedSubject}&`
      }
      
      // Add role filter based on current user's role
      url += `role=${userRole === 'STUDENT' ? 'STUDENT' : 'TEACHER'}`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.users) {
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const fetchMentorships = async () => {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/peer-teaching/mentorships')
      const data = await response.json()
      
      if (data.pendingRequests) {
        setPendingRequests(data.pendingRequests)
      }
      
      if (data.activeMentorships) {
        setActiveMentorships(data.activeMentorships)
      }
    } catch (error) {
      console.error('Error fetching mentorships:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleUserSelect = (user: User) => {
    setSelectedUser(user)
  }
  
  const handleCreateMentorship = async () => {
    if (!selectedUser || !selectedSubject || !mentorshipGoals.trim()) return
    
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/peer-teaching/mentorships', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          menteeId: userRole === 'STUDENT' ? userId : selectedUser.id,
          mentorId: userRole === 'STUDENT' ? selectedUser.id : userId,
          subjectId: selectedSubject,
          goals: mentorshipGoals.trim(),
          startDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to create mentorship')
      }
      
      // Call the onCreateMentorship callback if provided
      if (onCreateMentorship) {
        await onCreateMentorship(
          userRole === 'STUDENT' ? selectedUser.id : selectedUser.id,
          selectedSubject,
          mentorshipGoals.trim()
        )
      }
      
      // Reset form and switch to requests tab
      setSelectedUser(null)
      setMentorshipGoals('')
      setSelectedDate(undefined)
      setActiveTab('requests')
      
      // Refresh mentorships
      fetchMentorships()
    } catch (error) {
      console.error('Error creating mentorship:', error)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleAcceptMentorship = async (mentorshipId: string) => {
    try {
      const response = await fetch(`/api/peer-teaching/mentorships/${mentorshipId}/accept`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Failed to accept mentorship')
      }
      
      // Call the onAcceptMentorship callback if provided
      if (onAcceptMentorship) {
        await onAcceptMentorship(mentorshipId)
      }
      
      // Refresh mentorships
      fetchMentorships()
    } catch (error) {
      console.error('Error accepting mentorship:', error)
    }
  }
  
  const handleDeclineMentorship = async (mentorshipId: string) => {
    try {
      const response = await fetch(`/api/peer-teaching/mentorships/${mentorshipId}/decline`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Failed to decline mentorship')
      }
      
      // Call the onDeclineMentorship callback if provided
      if (onDeclineMentorship) {
        await onDeclineMentorship(mentorshipId)
      }
      
      // Refresh mentorships
      fetchMentorships()
    } catch (error) {
      console.error('Error declining mentorship:', error)
    }
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Peer Mentorship</CardTitle>
        <CardDescription>
          {userRole === 'STUDENT' 
            ? 'Find mentors to help you learn or become a mentor to others'
            : 'Mentor students or find other teachers to collaborate with'}
        </CardDescription>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="px-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="find">
              <UserPlus className="h-4 w-4 mr-2" />
              Find {userRole === 'STUDENT' ? 'Mentors' : 'Students'}
            </TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="active">
              <Users className="h-4 w-4 mr-2" />
              Active Mentorships
            </TabsTrigger>
          </TabsList>
        </div>
        
        <CardContent className="pt-6">
          <TabsContent value="find" className="mt-0">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search by Name</Label>
                  <Input
                    id="search"
                    placeholder={`Search for ${userRole === 'STUDENT' ? 'mentors' : 'students'}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <div className="flex-1">
                  <Label htmlFor="subject">Filter by Subject</Label>
                  <Select
                    value={selectedSubject || ''}
                    onValueChange={(value) => setSelectedSubject(value || null)}
                  >
                    <SelectTrigger id="subject" className="mt-1">
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Subjects</SelectItem>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="border rounded-md">
                <div className="p-3 border-b bg-muted">
                  <h3 className="font-medium">
                    {userRole === 'STUDENT' ? 'Available Mentors' : 'Students Looking for Mentors'}
                  </h3>
                </div>
                
                <div className="divide-y">
                  {isLoading ? (
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : users.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-muted-foreground">
                        {searchQuery || selectedSubject 
                          ? 'No users match your search criteria'
                          : 'Enter a search term or select a subject to find users'}
                      </p>
                    </div>
                  ) : (
                    users.map((user) => (
                      <div 
                        key={user.id} 
                        className={`p-4 flex items-center justify-between hover:bg-muted/50 cursor-pointer ${
                          selectedUser?.id === user.id ? 'bg-muted' : ''
                        }`}
                        onClick={() => handleUserSelect(user)}
                      >
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10 mr-4">
                            <AvatarImage src={user.avatarUrl} alt={user.name} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {user.grade ? `Grade ${user.grade}` : user.role}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {user.subjects?.slice(0, 3).map((subject) => (
                            <Badge key={subject.id} variant="outline" className="text-xs">
                              {subject.name}
                            </Badge>
                          ))}
                          {user.subjects && user.subjects.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.subjects.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              {selectedUser && (
                <div className="border rounded-md p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Request Mentorship with {selectedUser.name}</h3>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setSelectedUser(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="mentorship-subject">Subject</Label>
                    <Select
                      value={selectedSubject || ''}
                      onValueChange={(value) => setSelectedSubject(value)}
                    >
                      <SelectTrigger id="mentorship-subject">
                        <SelectValue placeholder="Select a subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id || ''}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="mentorship-goals">Mentorship Goals</Label>
                    <Textarea
                      id="mentorship-goals"
                      placeholder="Describe what you hope to achieve through this mentorship..."
                      value={mentorshipGoals}
                      onChange={(e) => setMentorshipGoals(e.target.value)}
                      rows={4}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="start-date">Preferred Start Date (Optional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="start-date"
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, 'PPP') : 'Select a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <Button
                    className="w-full"
                    onClick={handleCreateMentorship}
                  >\

