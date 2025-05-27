"use client";

import { useState, useEffect } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Session } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';

const mockSessions: Session[] = [
  { id: '1', clientId: '1', clientName: 'Alice Wonderland', dogName: 'Cheshire', date: '2024-07-29', time: '10:00 AM', status: 'Scheduled' },
  { id: '2', clientId: '2', clientName: 'Bob The Builder', dogName: 'Scoop', date: '2024-07-24', time: '02:00 PM', status: 'Scheduled' },
  { id: '3', clientId: '3', clientName: 'Charlie Brown', dogName: 'Snoopy', date: '2024-08-01', time: '11:30 AM', status: 'Scheduled' },
  { id: '4', clientId: '1', clientName: 'Alice Wonderland', dogName: 'Cheshire', date: '2024-08-05', time: '10:00 AM', status: 'Scheduled' },
  { id: '5', clientId: '2', clientName: 'Bob The Builder', dogName: 'Scoop', date: '2024-08-07', time: '02:00 PM', status: 'Completed' },
];


export default function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [currentMonthSessions, setCurrentMonthSessions] = useState<Session[]>([]);

  useEffect(() => {
    if (date) {
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      const filtered = mockSessions.filter(session => {
        const sessionDate = parseISO(session.date);
        return sessionDate >= monthStart && sessionDate <= monthEnd;
      });
      setCurrentMonthSessions(filtered);
    }
  }, [date]);

  const selectedDateString = date ? format(date, 'yyyy-MM-dd') : null;
  const sessionsOnSelectedDate = selectedDateString 
    ? mockSessions.filter(s => s.date === selectedDateString)
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Session Calendar</h1>
        <Button>Schedule New Session</Button>
      </div>
      
      <Tabs defaultValue="month" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="day">Day</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="month">Month</TabsTrigger>
        </TabsList>
        <TabsContent value="month">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 shadow-lg">
              <CardContent className="p-2 md:p-4 flex justify-center">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-md"
                  modifiers={{ 
                    scheduled: mockSessions.map(s => parseISO(s.date)) 
                  }}
                  modifiersStyles={{ 
                    scheduled: { border: "2px solid hsl(var(--primary))", borderRadius: 'var(--radius)'}
                  }}
                />
              </CardContent>
            </Card>
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>
                  {date ? format(date, 'MMMM d, yyyy') : 'Select a date'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sessionsOnSelectedDate.length > 0 ? (
                  <ul className="space-y-3">
                    {sessionsOnSelectedDate.map(session => (
                      <li key={session.id} className="p-3 rounded-md border bg-card hover:bg-muted/50 transition-colors">
                        <div className="font-semibold">{session.clientName} & {session.dogName}</div>
                        <div className="text-sm text-muted-foreground">{session.time}</div>
                        <Badge variant={session.status === 'Scheduled' ? 'default' : 'secondary'} className="mt-1">{session.status}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No sessions scheduled for this day.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="day">
          <Card className="shadow-lg">
            <CardHeader><CardTitle>Day View (Placeholder)</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground">Detailed day view will be implemented here.</p></CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="week">
          <Card className="shadow-lg">
            <CardHeader><CardTitle>Week View (Placeholder)</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground">Detailed week view will be implemented here.</p></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
