'use client';

import { useState, useEffect } from 'react';
import { MonthlyMembershipData, YearlyMembershipSummary, MembershipWithClient } from '@/lib/types';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { ChevronRight, X, Users, TrendingUp, TrendingDown, ChevronLeft, Target, Calendar, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export default function MembershipsPage() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [monthlyData, setMonthlyData] = useState<MonthlyMembershipData[]>([]);
  const [yearlyData, setYearlyData] = useState<YearlyMembershipSummary[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<MonthlyMembershipData | null>(null);
  const [monthMembers, setMonthMembers] = useState<MembershipWithClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMonthSheetOpen, setIsMonthSheetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  // Only show years that have data (totalMRR > 0), but always include 2024
  const availableYears = yearlyData
    .filter(yearData => yearData.totalMRR > 0 || yearData.year === 2024)
    .map(yearData => yearData.year)
    .sort((a, b) => b - a); // Sort descending (newest first)

  useEffect(() => {
    fetchYearlyData();
  }, []);

  useEffect(() => {
    fetchMonthlyData();
  }, [selectedYear]);

  useEffect(() => {
    console.log('🔄 monthMembers state changed:', monthMembers);
  }, [monthMembers]);

  const fetchYearlyData = async () => {
    try {
      const response = await fetch('/api/memberships/analytics?type=yearly');
      if (response.ok) {
        const data = await response.json();
        setYearlyData(data);
      }
    } catch (error) {
      console.error('Error fetching yearly membership data:', error);
    }
  };



  const fetchMonthlyData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/memberships/analytics?year=${selectedYear}`);
      if (response.ok) {
        const data = await response.json();
        setMonthlyData(data);
        setError(null);
      } else {
        setError('Failed to fetch membership data');
      }
    } catch (error) {
      console.error('Error fetching monthly membership data:', error);
      setError('Failed to fetch membership data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMonthMembers = async (year: number, month: number) => {
    try {
      console.log(`🔍 Fetching members for ${year}-${month}`);
      const response = await fetch(`/api/memberships?year=${year}&month=${month}`);
      console.log('📡 Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Found ${data.length} members for ${year}-${month}:`, data);
        console.log('🔍 Setting monthMembers state with:', data);
        setMonthMembers(data);
        console.log('✅ monthMembers state updated');
      } else {
        console.error('❌ Failed to fetch month members:', response.status, response.statusText);
        setMonthMembers([]);
      }
    } catch (error) {
      console.error('❌ Error fetching month members:', error);
      setMonthMembers([]);
    }
  };

  const handleMonthClick = (monthData: MonthlyMembershipData) => {
    console.log('🎯 Month clicked:', monthData);
    setSelectedMonth(monthData);
    setIsMonthSheetOpen(true);
    fetchMonthMembers(monthData.year, monthData.month);
  };

  const getMonthName = (month: number) => {
    return new Date(2024, month - 1).toLocaleString('default', { month: 'long' });
  };

  const currentYearData = yearlyData.find(y => y.year === selectedYear);

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (growth < 0) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10 h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading membership data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive text-center py-10">
        <p>Error loading membership data: {error}</p>
        <p>Please ensure you are online and try again.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Memberships{currentYearData ? ` - £${currentYearData.totalMRR.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
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
        {monthlyData.length > 0 ? (
          monthlyData
            .sort((a, b) => {
              // Sort by year descending, then by month descending (newest first)
              if (a.year !== b.year) {
                return b.year - a.year;
              }
              return b.month - a.month;
            })
            .map((monthData) => (
            <div
              key={`${monthData.year}-${monthData.month}`}
              className="py-3 border-b border-border last:border-b-0 cursor-pointer hover:bg-muted/50 px-4"
              onClick={() => handleMonthClick(monthData)}
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
                    <h3 className="font-semibold text-sm">{getMonthName(monthData.month)} {monthData.year}</h3>
                    <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {monthData.totalMembers} members
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        MRR: {formatCurrency(monthData.monthlyRecurringRevenue)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-foreground">
                    {monthData.totalMembers} Members
                  </div>
                  <div className={cn(
                    "text-xs flex items-center gap-1",
                    monthData.growthPercentage >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {monthData.growthPercentage >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {monthData.growthPercentage >= 0 ? '+' : ''}{monthData.growthPercentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No membership data available for {selectedYear}
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
              {selectedMonth && `${getMonthName(selectedMonth.month)} ${selectedMonth.year}`}
            </SheetTitle>
            <Separator />
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="py-4 space-y-6">
              {selectedMonth && (
                <>
                  {/* Month Summary */}
                  <div className="space-y-3">
                    <h3 className="font-medium">Month Summary</h3>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Members</p>
                          <p className="text-lg font-semibold">{selectedMonth.totalMembers}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">MRR</p>
                          <p className="text-lg font-semibold text-green-600">{formatCurrency(selectedMonth.monthlyRecurringRevenue)}</p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Growth</span>
                          <span className={cn(
                            "font-medium",
                            selectedMonth.growthPercentage >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            {selectedMonth.growthPercentage >= 0 ? '+' : ''}{selectedMonth.growthPercentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Members List */}
                  {monthMembers.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-medium">Members ({monthMembers.length})</h3>
                      <div className="space-y-2">
                        {monthMembers.map((membership) => (
                          <div key={membership.id} className="p-3 border rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-sm">
                                  {membership.clients?.[0]
                                    ? `${membership.clients[0].owner_first_name} ${membership.clients[0].owner_last_name}`
                                    : membership.client || 'Unknown Client'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(membership.date)}
                                </p>
                                <Badge variant="outline" className="mt-1 text-xs">
                                  Membership Payment
                                </Badge>
                              </div>
                              <p className="font-medium text-green-600">
                                {formatCurrency(membership.amount)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {monthMembers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No members found for this month
                      <div className="text-xs mt-2">
                        Debug: monthMembers.length = {monthMembers.length}
                      </div>
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
