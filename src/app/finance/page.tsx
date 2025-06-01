
"use client";

import { useState, useEffect, useMemo } from 'react';
import type { Session, MembershipWithClient } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Loader2,
  Edit,
  Check,
  X,
  ChevronLeft,
  Target,
  Calendar,
  Users
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isValid, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { cn, formatFullNameAndDogName, formatTimeWithoutSeconds } from '@/lib/utils';
import Image from 'next/image';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from 'recharts';

// Types
interface ExpectedRevenueTarget {
  id: string;
  year: number;
  month: number;
  expected_amount: number;
  created_at: string;
  updated_at: string;
}

interface MonthData {
  year: number;
  month: number;
  monthName: string;
  actualRevenue: number;
  expectedRevenue: number;
  variance: number;
  sessionCount: number;
  sessions: Session[];
  membershipRevenue: number;
  membershipCount: number;
  memberships: MembershipWithClient[];
}

// API functions
const getSessions = async () => {
  const response = await fetch('/api/sessions');
  if (!response.ok) throw new Error('Failed to fetch sessions');
  return response.json();
};

const getExpectedRevenue = async (year?: number, month?: number) => {
  const params = new URLSearchParams();
  if (year) params.append('year', year.toString());
  if (month) params.append('month', month.toString());

  const response = await fetch(`/api/expected-revenue?${params}`);
  if (!response.ok) throw new Error('Failed to fetch expected revenue');
  return response.json();
};

const getMemberships = async () => {
  const response = await fetch('/api/memberships');
  if (!response.ok) throw new Error('Failed to fetch memberships');
  return response.json();
};

const saveExpectedRevenue = async (year: number, month: number, amount: number) => {
  console.log('Saving expected revenue:', { year, month, amount });

  const response = await fetch('/api/expected-revenue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ year, month, expected_amount: amount }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Failed to save expected revenue:', response.status, errorData);
    throw new Error(`Failed to save expected revenue: ${response.status}`);
  }

  const result = await response.json();
  console.log('Save result:', result);
  return result;
};

export default function FinancePage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [memberships, setMemberships] = useState<MembershipWithClient[]>([]);
  const [expectedTargets, setExpectedTargets] = useState<ExpectedRevenueTarget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<MonthData | null>(null);
  const [isMonthSheetOpen, setIsMonthSheetOpen] = useState(false);
  const [isEditingExpected, setIsEditingExpected] = useState(false);
  const [editExpectedValue, setEditExpectedValue] = useState('');

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [sessionsResponse, membershipsResponse, expectedResponse] = await Promise.all([
          getSessions(),
          getMemberships(),
          getExpectedRevenue()
        ]);
        setSessions(sessionsResponse.data || []);
        setMemberships(membershipsResponse || []);
        setExpectedTargets(expectedResponse || []);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter sessions with amounts (paid sessions)
  const paidSessions = useMemo(() =>
    sessions.filter(session => session.amount && session.amount > 0),
    [sessions]
  );

  // Calculate month data for selected year
  const monthsData = useMemo(() => {
    const monthsMap = new Map<string, MonthData>();

    // Initialize all months for the selected year
    for (let month = 0; month < 12; month++) {
      const monthKey = `${selectedYear}-${month}`;
      const monthName = format(new Date(selectedYear, month, 1), 'MMMM');

      // Find expected revenue for this month
      const expectedTarget = expectedTargets.find(
        target => target.year === selectedYear && target.month === month + 1
      );

      monthsMap.set(monthKey, {
        year: selectedYear,
        month: month + 1,
        monthName,
        actualRevenue: 0,
        expectedRevenue: expectedTarget?.expected_amount || 0,
        variance: 0,
        sessionCount: 0,
        sessions: [],
        membershipRevenue: 0,
        membershipCount: 0,
        memberships: []
      });
    }

    // Add session data to months
    paidSessions.forEach(session => {
      const sessionDate = parseISO(session.date);
      if (isValid(sessionDate) && sessionDate.getFullYear() === selectedYear) {
        const month = sessionDate.getMonth();
        const monthKey = `${selectedYear}-${month}`;
        const monthData = monthsMap.get(monthKey);

        if (monthData) {
          monthData.actualRevenue += session.amount || 0;
          monthData.sessionCount += 1;
          monthData.sessions.push(session);
        }
      }
    });

    // Add membership data to months
    memberships.forEach(membership => {
      const membershipDate = parseISO(membership.date);
      if (isValid(membershipDate) && membershipDate.getFullYear() === selectedYear) {
        const month = membershipDate.getMonth();
        const monthKey = `${selectedYear}-${month}`;
        const monthData = monthsMap.get(monthKey);

        if (monthData) {
          monthData.membershipRevenue += membership.amount || 0;
          monthData.membershipCount += 1;
          monthData.memberships.push(membership);
          // Add membership revenue to total actual revenue
          monthData.actualRevenue += membership.amount || 0;
        }
      }
    });

    // Calculate variance for each month
    monthsMap.forEach(monthData => {
      monthData.variance = monthData.actualRevenue - monthData.expectedRevenue;
    });

    return Array.from(monthsMap.values())
      .filter(month => month.sessionCount > 0 || month.membershipCount > 0 || month.expectedRevenue > 0)
      .sort((a, b) => b.month - a.month); // Reverse chronological order
  }, [paidSessions, memberships, selectedYear, expectedTargets]);

  // Calculate year totals
  const yearTotals = useMemo(() => {
    const totalActual = monthsData.reduce((sum, month) => sum + month.actualRevenue, 0);
    const totalExpected = monthsData.reduce((sum, month) => sum + month.expectedRevenue, 0);
    const totalSessions = monthsData.reduce((sum, month) => sum + month.sessionCount, 0);
    const totalMemberships = monthsData.reduce((sum, month) => sum + month.membershipCount, 0);
    const totalMembershipRevenue = monthsData.reduce((sum, month) => sum + month.membershipRevenue, 0);

    return {
      actualRevenue: totalActual,
      expectedRevenue: totalExpected,
      variance: totalActual - totalExpected,
      sessionCount: totalSessions,
      membershipCount: totalMemberships,
      membershipRevenue: totalMembershipRevenue
    };
  }, [monthsData]);

  // Available years for selection
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    paidSessions.forEach(session => {
      const sessionDate = parseISO(session.date);
      if (isValid(sessionDate)) {
        years.add(sessionDate.getFullYear());
      }
    });
    memberships.forEach(membership => {
      const membershipDate = parseISO(membership.date);
      if (isValid(membershipDate)) {
        years.add(membershipDate.getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [paidSessions, memberships]);

  // Handlers
  const handleMonthClick = (month: MonthData) => {
    setSelectedMonth(month);
    setIsMonthSheetOpen(true);
    setIsEditingExpected(false);
    setEditExpectedValue(month.expectedRevenue.toString());
  };

  const handleEditExpected = () => {
    setIsEditingExpected(true);
  };

  const handleSaveExpected = async () => {
    if (!selectedMonth) return;

    try {
      const amount = parseFloat(editExpectedValue) || 0;
      await saveExpectedRevenue(selectedMonth.year, selectedMonth.month, amount);

      // Refresh expected targets
      const expectedResponse = await getExpectedRevenue();
      setExpectedTargets(expectedResponse || []);

      // Update the selected month with new expected revenue
      const updatedMonth = {
        ...selectedMonth,
        expectedRevenue: amount,
        variance: selectedMonth.actualRevenue - amount
      };
      setSelectedMonth(updatedMonth);

      setIsEditingExpected(false);
    } catch (error) {
      console.error('Error saving expected revenue:', error);
      // You could add a toast notification here for better UX
      alert('Failed to save expected revenue. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setIsEditingExpected(false);
    setEditExpectedValue(selectedMonth?.expectedRevenue.toString() || '');
  };

  // Chart colors
  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0', '#ffb347'];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10 h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading financial data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive text-center py-10">
        <p>Error loading financial data: {error}</p>
        <p>Please ensure you are online and try again.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Finance - £{yearTotals.actualRevenue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h1>
        <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(Number(value))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map(year => (
              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Months List */}
      <div className="space-y-2">
        {monthsData.length > 0 ? (
          monthsData.map((month) => (
            <div
              key={`${month.year}-${month.month}`}
              className="py-3 border-b border-border last:border-b-0 cursor-pointer hover:bg-muted/50 px-4"
              onClick={() => handleMonthClick(month)}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3 flex-grow">
                  <Image
                    src="https://iili.io/34300ox.md.jpg"
                    alt="RMR Logo"
                    width={32}
                    height={32}
                    className="rounded-md"
                  />
                  <div>
                    <h3 className="font-semibold text-sm">{month.monthName} {month.year}</h3>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {month.sessionCount} sessions
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {month.membershipCount} memberships
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        Expected: £{month.expectedRevenue.toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-green-600">
                    £{month.actualRevenue.toFixed(0)}
                  </div>
                  <div className={cn(
                    "text-xs flex items-center gap-1",
                    month.variance >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {month.variance >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {month.variance >= 0 ? '+' : ''}£{month.variance.toFixed(0)}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No financial data available for {selectedYear}
          </div>
        )}
      </div>

      {/* Month Details Sheet */}
      <Sheet open={isMonthSheetOpen} onOpenChange={setIsMonthSheetOpen}>
        <SheetContent className="flex flex-col h-full sm:max-w-lg bg-card">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMonthSheetOpen(false)}
                className="p-1 h-auto"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {selectedMonth?.monthName} {selectedMonth?.year}
            </SheetTitle>
            <Separator />
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="py-4 space-y-6">
              {selectedMonth && (
                <>
                  {/* Expected Revenue Section */}
                  <div className="space-y-3">
                    <h3 className="font-medium">Revenue Target</h3>

                    {isEditingExpected ? (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label htmlFor="expected-amount">Expected Revenue</Label>
                          <Input
                            id="expected-amount"
                            type="number"
                            value={editExpectedValue}
                            onChange={(e) => setEditExpectedValue(e.target.value)}
                            placeholder="0.00"
                            autoFocus
                            className="focus:ring-0 focus:ring-offset-0"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveExpected} className="h-8 w-8 p-0">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={handleCancelEdit} className="h-8 w-8 p-0">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={handleEditExpected}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Expected</p>
                            <p className="text-lg font-semibold">£{selectedMonth.expectedRevenue.toFixed(2)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Actual</p>
                            <p className="text-lg font-semibold text-green-600">£{selectedMonth.actualRevenue.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Variance</span>
                            <span className={cn(
                              "font-medium",
                              selectedMonth.variance >= 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {selectedMonth.variance >= 0 ? '+' : ''}£{selectedMonth.variance.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Session Type Breakdown */}
                  {selectedMonth.sessions.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-medium">Session Type Breakdown</h3>
                      <div className="space-y-2">
                        {Object.entries(
                          selectedMonth.sessions.reduce((acc, session) => {
                            const type = session.sessionType || 'Unknown';
                            if (!acc[type]) {
                              acc[type] = { count: 0, revenue: 0 };
                            }
                            acc[type].count += 1;
                            acc[type].revenue += session.amount || 0;
                            return acc;
                          }, {} as Record<string, { count: number; revenue: number }>)
                        ).map(([type, data]) => (
                          <div key={type} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{type}</p>
                              <p className="text-sm text-muted-foreground">{data.count} sessions</p>
                            </div>
                            <p className="font-medium">£{data.revenue.toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Membership Breakdown */}
                  {selectedMonth.memberships.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-medium">Membership Revenue</h3>
                      <div className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Monthly Memberships</p>
                            <p className="text-sm text-muted-foreground">{selectedMonth.membershipCount} members</p>
                          </div>
                          <p className="font-medium">£{selectedMonth.membershipRevenue.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Memberships List */}
                  {selectedMonth.memberships.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-medium">Memberships ({selectedMonth.memberships.length})</h3>
                      <div className="space-y-2">
                        {selectedMonth.memberships
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map((membership) => (
                            <div key={membership.id} className="p-3 border rounded-lg">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium text-sm">
                                    {membership.clients?.[0]
                                      ? `${membership.clients[0].owner_first_name} ${membership.clients[0].owner_last_name}`
                                      : membership.client || 'Unknown Client'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {isValid(parseISO(membership.date))
                                      ? format(parseISO(membership.date), 'dd/MM/yyyy')
                                      : membership.date
                                    }
                                  </p>
                                  <Badge variant="outline" className="mt-1 text-xs">
                                    Membership Payment
                                  </Badge>
                                </div>
                                <p className="font-medium text-green-600">
                                  £{membership.amount?.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Sessions List */}
                  {selectedMonth.sessions.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-medium">Sessions ({selectedMonth.sessions.length})</h3>
                      <div className="space-y-2">
                        {selectedMonth.sessions
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map((session) => (
                            <div key={session.id} className="p-3 border rounded-lg">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium text-sm">
                                    {session.sessionType === 'Group'
                                      ? 'Group Session'
                                      : session.sessionType === 'RMR Live'
                                      ? 'RMR Live'
                                      : formatFullNameAndDogName(session.clientName, session.dogName)
                                    }
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {isValid(parseISO(session.date))
                                      ? format(parseISO(session.date), 'dd/MM/yyyy')
                                      : session.date
                                    } • {formatTimeWithoutSeconds(session.time)}
                                  </p>
                                  <Badge variant="outline" className="mt-1 text-xs">
                                    {session.sessionType}
                                  </Badge>
                                </div>
                                <p className="font-medium text-green-600">
                                  £{session.amount?.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {selectedMonth.sessions.length === 0 && selectedMonth.memberships.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No sessions or memberships found for this month
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
