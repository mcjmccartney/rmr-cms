'use client';

import { useApp } from '@/context/AppContext';
import Header from '@/components/layout/Header';

export default function FinancePage() {
  const { state } = useApp();

  // Calculate total finances
  const totalFinances = state.finances.reduce((total, finance) => total + finance.actual, 0);
  
  // Group finances by year
  const financesByYear = state.finances.reduce((acc, finance) => {
    const year = finance.year;
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(finance);
    return acc;
  }, {} as Record<number, typeof state.finances>);

  // Calculate year totals
  const yearTotals = Object.entries(financesByYear).map(([year, finances]) => ({
    year: parseInt(year),
    total: finances.reduce((sum, f) => sum + f.actual, 0),
    finances: finances.sort((a, b) => {
      const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December'];
      return monthOrder.indexOf(b.month) - monthOrder.indexOf(a.month);
    })
  })).sort((a, b) => b.year - a.year);

  const formatCurrency = (amount: number) => {
    return `£${amount.toLocaleString()}`;
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-green-600';
    if (variance < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getVarianceText = (variance: number) => {
    if (variance === 0) return '£0';
    const sign = variance > 0 ? '+' : '';
    return `${sign}£${variance}`;
  };

  return (
    <div className="min-h-screen bg-amber-800" style={{ paddingTop: 'max(env(safe-area-inset-top), 20px)' }}>
      <Header
        title={`Finances Total - ${formatCurrency(totalFinances)}`}
      />

      <div className="px-4 py-4 space-y-6 bg-gray-50 min-h-screen">
        {yearTotals.map(({ year, total, finances }) => (
          <div key={year} className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Year Header */}
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                {year}/{(year + 1).toString().slice(-2)} - {formatCurrency(total)}
              </h2>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-4 gap-4 px-4 py-3 bg-gray-50 border-b text-sm font-medium text-gray-600">
              <div>MONTH</div>
              <div className="text-right">EXPECTED</div>
              <div className="text-right">ACTUAL</div>
              <div className="text-right">VARIANCE</div>
            </div>

            {/* Finance Rows */}
            <div className="divide-y divide-gray-100">
              {finances.map((finance) => (
                <div key={`${finance.year}-${finance.month}`} className="grid grid-cols-4 gap-4 px-4 py-3 text-sm">
                  <div className="font-medium text-gray-900">{finance.month}</div>
                  <div className="text-right text-gray-600">
                    {formatCurrency(finance.expected)}
                  </div>
                  <div className="text-right text-gray-900 font-medium">
                    {formatCurrency(finance.actual)}
                  </div>
                  <div className={`text-right font-medium ${getVarianceColor(finance.variance)}`}>
                    {getVarianceText(finance.variance)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
