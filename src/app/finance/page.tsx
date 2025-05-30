
"use client";

import { useState, useEffect, useMemo } from 'react';
import type { Session } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CalendarDays,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  BarChart3,
  PieChart,
  Loader2,
  Calendar,
  CreditCard
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isValid, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { cn, formatFullNameAndDogName, formatTimeWithoutSeconds } from '@/lib/utils';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts';

// API functions
const getSessions = async () => {
  const response = await fetch('/api/sessions');
  if (!response.ok) throw new Error('Failed to fetch sessions');
  return response.json();
};

export default function FinancePage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Fetch sessions data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await getSessions();
        setSessions(response.data || []);
      } catch (err) {
        console.error("Error fetching sessions:", err);
        setError(err instanceof Error ? err.message : "Failed to load sessions.");
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

  // Calculate financial metrics
  const financialMetrics = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    // Total revenue (all time)
    const totalRevenue = paidSessions.reduce((sum, session) => sum + (session.amount || 0), 0);

    // Current year revenue
    const currentYearSessions = paidSessions.filter(session => {
      const sessionDate = parseISO(session.date);
      return isValid(sessionDate) && sessionDate.getFullYear() === currentYear;
    });
    const currentYearRevenue = currentYearSessions.reduce((sum, session) => sum + (session.amount || 0), 0);

    // Current month revenue
    const currentMonthSessions = paidSessions.filter(session => {
      const sessionDate = parseISO(session.date);
      return isValid(sessionDate) &&
             sessionDate.getFullYear() === currentYear &&
             sessionDate.getMonth() === currentMonth;
    });
    const currentMonthRevenue = currentMonthSessions.reduce((sum, session) => sum + (session.amount || 0), 0);

    // Average session value
    const averageSessionValue = paidSessions.length > 0 ? totalRevenue / paidSessions.length : 0;

    return {
      totalRevenue,
      currentYearRevenue,
      currentMonthRevenue,
      averageSessionValue,
      totalSessions: paidSessions.length,
      currentYearSessions: currentYearSessions.length,
      currentMonthSessions: currentMonthSessions.length,
    };
  }, [paidSessions]);

  // Monthly revenue data for charts
  const monthlyRevenueData = useMemo(() => {
    const monthlyData: { [key: string]: number } = {};

    paidSessions.forEach(session => {
      const sessionDate = parseISO(session.date);
      if (isValid(sessionDate) && sessionDate.getFullYear() === selectedYear) {
        const monthKey = format(sessionDate, 'MMM yyyy');
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + (session.amount || 0);
      }
    });

    return Object.entries(monthlyData)
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  }, [paidSessions, selectedYear]);

  // Session type breakdown
  const sessionTypeData = useMemo(() => {
    const typeData: { [key: string]: { count: number; revenue: number } } = {};

    paidSessions.forEach(session => {
      const type = session.sessionType || 'Unknown';
      if (!typeData[type]) {
        typeData[type] = { count: 0, revenue: 0 };
      }
      typeData[type].count += 1;
      typeData[type].revenue += session.amount || 0;
    });

    return Object.entries(typeData)
      .map(([type, data]) => ({
        type,
        count: data.count,
        revenue: data.revenue,
        percentage: ((data.revenue / financialMetrics.totalRevenue) * 100).toFixed(1)
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [paidSessions, financialMetrics.totalRevenue]);

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
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Financial Dashboard</h1>
        <div className="flex items-center gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border rounded-md bg-background"
          >
            {Array.from(new Set(paidSessions.map(s => parseISO(s.date).getFullYear())))
              .sort((a, b) => b - a)
              .map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
          </select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{financialMetrics.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {financialMetrics.totalSessions} sessions
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Year</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{financialMetrics.currentYearRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {financialMetrics.currentYearSessions} sessions
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{financialMetrics.currentMonthRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {financialMetrics.currentMonthSessions} sessions
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Session Value</CardTitle>
            <BarChart3 className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{financialMetrics.averageSessionValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Per session
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="monthly" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="monthly">Monthly Revenue</TabsTrigger>
          <TabsTrigger value="session-types">Session Types</TabsTrigger>
          <TabsTrigger value="recent">Recent Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue - {selectedYear}</CardTitle>
              <CardDescription>Revenue breakdown by month</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyRevenueData.length > 0 ? (
                <ChartContainer
                  config={{
                    revenue: {
                      label: "Revenue",
                      color: "hsl(var(--primary))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <BarChart data={monthlyRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      formatter={(value) => [`£${Number(value).toFixed(2)}`, 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill="var(--color-revenue)" />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No revenue data available for {selectedYear}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="session-types" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Session Type</CardTitle>
                <CardDescription>Breakdown of revenue by session type</CardDescription>
              </CardHeader>
              <CardContent>
                {sessionTypeData.length > 0 ? (
                  <ChartContainer
                    config={Object.fromEntries(
                      sessionTypeData.map((item, index) => [
                        item.type.toLowerCase().replace(/\s+/g, '-'),
                        {
                          label: item.type,
                          color: COLORS[index % COLORS.length],
                        },
                      ])
                    )}
                    className="h-[300px]"
                  >
                    <RechartsPieChart>
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        formatter={(value) => [`£${Number(value).toFixed(2)}`, 'Revenue']}
                      />
                      <Pie
                        data={sessionTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ percentage }) => `${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="revenue"
                      >
                        {sessionTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartLegend content={<ChartLegendContent />} />
                    </RechartsPieChart>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No session type data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Session Type Statistics</CardTitle>
                <CardDescription>Detailed breakdown by session type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sessionTypeData.map((item, index) => (
                    <div key={item.type} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <div>
                          <p className="font-medium">{item.type}</p>
                          <p className="text-sm text-muted-foreground">{item.count} sessions</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">£{item.revenue.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">{item.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Sessions</CardTitle>
              <CardDescription>Latest sessions with revenue information</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Session Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paidSessions
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 10)
                    .map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>
                          {isValid(parseISO(session.date))
                            ? format(parseISO(session.date), 'dd/MM/yyyy')
                            : session.date
                          }
                        </TableCell>
                        <TableCell>{formatTimeWithoutSeconds(session.time)}</TableCell>
                        <TableCell>
                          {session.sessionType === 'Group'
                            ? 'Group Session'
                            : session.sessionType === 'RMR Live'
                            ? 'RMR Live'
                            : formatFullNameAndDogName(session.clientName, session.dogName)
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{session.sessionType}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          £{session.amount?.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              {paidSessions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No sessions with revenue data found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
