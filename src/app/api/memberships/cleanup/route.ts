import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(request: NextRequest) {
  try {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-indexed

    // Delete memberships between 2016 and 2023 (inclusive)
    const { error: oldMembershipsError } = await supabase
      .from('memberships')
      .delete()
      .gte('date', '2016-01-01')
      .lt('date', '2024-01-01');

    if (oldMembershipsError) {
      console.error('Error deleting old memberships:', oldMembershipsError);
      return NextResponse.json(
        { error: 'Failed to delete old memberships' },
        { status: 500 }
      );
    }

    // Delete future months in 2025 (months after current month)
    if (currentYear === 2025) {
      const futureDate = `2025-${String(currentMonth + 1).padStart(2, '0')}-01`;
      
      const { error: futureMembershipsError } = await supabase
        .from('memberships')
        .delete()
        .gte('date', futureDate)
        .lt('date', '2026-01-01');

      if (futureMembershipsError) {
        console.error('Error deleting future memberships:', futureMembershipsError);
        return NextResponse.json(
          { error: 'Failed to delete future memberships' },
          { status: 500 }
        );
      }
    } else if (currentYear < 2025) {
      // If we're before 2025, delete all 2025 memberships
      const { error: all2025Error } = await supabase
        .from('memberships')
        .delete()
        .gte('date', '2025-01-01')
        .lt('date', '2026-01-01');

      if (all2025Error) {
        console.error('Error deleting all 2025 memberships:', all2025Error);
        return NextResponse.json(
          { error: 'Failed to delete 2025 memberships' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ 
      message: 'Memberships cleaned up successfully',
      deletedRanges: [
        '2016-2023 memberships',
        currentYear === 2025 ? `Future months in 2025 (after ${currentMonth})` : 'All 2025 memberships'
      ]
    });

  } catch (error) {
    console.error('Error in membership cleanup:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
