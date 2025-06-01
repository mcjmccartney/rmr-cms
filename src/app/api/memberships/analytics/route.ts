import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MonthlyMembershipData, YearlyMembershipSummary } from '@/lib/types';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase configuration is missing');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const type = searchParams.get('type'); // 'monthly' or 'yearly'

    if (type === 'yearly') {
      return getYearlyAnalytics(supabase, year);
    } else {
      return getMonthlyAnalytics(supabase, year);
    }
  } catch (error) {
    console.error('Error in membership analytics API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getYearlyAnalytics(supabase: any, year?: string | null) {
  try {
    // Get all memberships
    const { data: allMemberships, error: membershipError } = await supabase
      .from('memberships')
      .select('*')
      .order('date', { ascending: true });

    if (membershipError) {
      console.error('Error fetching memberships for yearly analytics:', membershipError);
      return NextResponse.json({ error: 'Failed to fetch membership data' }, { status: 500 });
    }

    // Get all clients for matching
    const { data: allClients, error: clientError } = await supabase
      .from('clients')
      .select('*');

    if (clientError) {
      console.error('Error fetching clients for yearly analytics:', clientError);
      return NextResponse.json({ error: 'Failed to fetch client data' }, { status: 500 });
    }

    // Match memberships with clients by email first, then by surname
    const memberships = allMemberships?.map(membership => {
      // First try exact email match
      let matchedClient = allClients?.find(client =>
        client.contact_email && membership.email &&
        client.contact_email.toLowerCase() === membership.email.toLowerCase()
      );

      // If no email match, try surname matching
      if (!matchedClient && membership.client) {
        const membershipSurname = membership.client.split(' ').pop()?.toLowerCase();
        if (membershipSurname) {
          matchedClient = allClients?.find(client =>
            client.owner_last_name &&
            client.owner_last_name.toLowerCase() === membershipSurname
          );
        }
      }

      return {
        ...membership,
        clients: matchedClient ? [matchedClient] : []
      };
    }) || [];

    const yearlyData: { [key: number]: YearlyMembershipSummary } = {};
    const currentYear = new Date().getFullYear();
    const targetYear = year ? parseInt(year) : currentYear;

    // Initialize years from earliest membership to current year
    const earliestYear = memberships.length > 0
      ? new Date(memberships[0].date).getFullYear()
      : currentYear;

    for (let y = earliestYear; y <= currentYear; y++) {
      yearlyData[y] = {
        year: y,
        totalMembers: 0,
        totalMRR: 0,
        growthFromPreviousYear: 0,
        newMembersThisYear: 0,
        cancelledMembersThisYear: 0,
      };
    }

    // Calculate yearly metrics based on payment dates
    memberships.forEach((membership: any) => {
      const paymentYear = new Date(membership.date).getFullYear();

      // Count payments for the year
      if (yearlyData[paymentYear]) {
        yearlyData[paymentYear].totalMembers++;
        yearlyData[paymentYear].totalMRR += membership.amount || 0;
        yearlyData[paymentYear].newMembersThisYear++;
      }
    });

    // Calculate growth percentages
    const years = Object.keys(yearlyData).map(Number).sort();
    years.forEach((y, index) => {
      if (index > 0) {
        const previousYear = years[index - 1];
        const currentYearData = yearlyData[y];
        const previousYearData = yearlyData[previousYear];

        if (previousYearData.totalMembers > 0) {
          currentYearData.growthFromPreviousYear =
            ((currentYearData.totalMembers - previousYearData.totalMembers) / previousYearData.totalMembers) * 100;
        }
      }
    });

    return NextResponse.json(Object.values(yearlyData).sort((a, b) => b.year - a.year));
  } catch (error) {
    console.error('Error in yearly analytics:', error);
    return NextResponse.json({ error: 'Failed to calculate yearly analytics' }, { status: 500 });
  }
}

async function getMonthlyAnalytics(supabase: any, year?: string | null) {
  try {
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    // Get all memberships for the target year and surrounding months
    const { data: allMemberships, error: membershipError } = await supabase
      .from('memberships')
      .select('*')
      .gte('date', `${targetYear - 1}-01-01`)
      .order('date', { ascending: true });

    if (membershipError) {
      console.error('Error fetching memberships for monthly analytics:', membershipError);
      return NextResponse.json({ error: 'Failed to fetch membership data' }, { status: 500 });
    }

    // Get all clients for matching
    const { data: allClients, error: clientError } = await supabase
      .from('clients')
      .select('*');

    if (clientError) {
      console.error('Error fetching clients for monthly analytics:', clientError);
      return NextResponse.json({ error: 'Failed to fetch client data' }, { status: 500 });
    }

    // Match memberships with clients by email first, then by surname
    const memberships = allMemberships?.map(membership => {
      // First try exact email match
      let matchedClient = allClients?.find(client =>
        client.contact_email && membership.email &&
        client.contact_email.toLowerCase() === membership.email.toLowerCase()
      );

      // If no email match, try surname matching
      if (!matchedClient && membership.client) {
        const membershipSurname = membership.client.split(' ').pop()?.toLowerCase();
        if (membershipSurname) {
          matchedClient = allClients?.find(client =>
            client.owner_last_name &&
            client.owner_last_name.toLowerCase() === membershipSurname
          );
        }
      }

      return {
        ...membership,
        clients: matchedClient ? [matchedClient] : []
      };
    }) || [];

    const monthlyData: MonthlyMembershipData[] = [];

    for (let month = 1; month <= 12; month++) {
      const monthStart = new Date(targetYear, month - 1, 1);
      const monthEnd = new Date(targetYear, month, 0);
      const previousMonthStart = new Date(targetYear, month - 2, 1);
      const previousMonthEnd = new Date(targetYear, month - 1, 0);

      // Calculate members for this month (based on payment date)
      const monthMembers = memberships.filter((membership: any) => {
        const membershipDate = new Date(membership.date);
        return membershipDate >= monthStart && membershipDate <= monthEnd;
      });

      // Calculate members for previous month
      const previousMonthMembers = memberships.filter((membership: any) => {
        const membershipDate = new Date(membership.date);
        return membershipDate >= previousMonthStart && membershipDate <= previousMonthEnd;
      });

      // For your table structure, we'll count payments as "active members"
      const newMembers = monthMembers.length;
      const cancelledMembers = 0; // Not applicable with current structure

      const totalMembers = monthMembers.length;
      const previousTotalMembers = previousMonthMembers.length;
      const netChange = totalMembers - previousTotalMembers;
      const growthPercentage = previousTotalMembers > 0
        ? (netChange / previousTotalMembers) * 100
        : 0;

      const monthlyRecurringRevenue = monthMembers.reduce((sum: number, membership: any) => {
        return sum + (membership.amount || 0);
      }, 0);

      monthlyData.push({
        year: targetYear,
        month,
        totalMembers,
        newMembers,
        cancelledMembers,
        netChange,
        monthlyRecurringRevenue,
        growthPercentage,
      });
    }

    return NextResponse.json(monthlyData);
  } catch (error) {
    console.error('Error in monthly analytics:', error);
    return NextResponse.json({ error: 'Failed to calculate monthly analytics' }, { status: 500 });
  }
}
