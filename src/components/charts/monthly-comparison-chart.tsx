'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MonthlyData {
  month: string;
  amount: number;
}

interface MonthlyComparisonChartProps {
  data: MonthlyData[];
  currency?: string;
}

export function MonthlyComparisonChart({ data, currency = 'USD' }: MonthlyComparisonChartProps) {
  const formatter = useMemo(
    () => new Intl.NumberFormat('en-US', { style: 'currency', currency }),
    [currency]
  );

  const avgSpending = useMemo(
    () => (data.length > 0 ? data.reduce((sum, d) => sum + d.amount, 0) / data.length : 0),
    [data]
  );

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Comparison</CardTitle>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-gray-500">
          No data available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${currency === 'USD' ? '$' : ''}${value}`}
              />
              <Tooltip
                formatter={(value) => [formatter.format(value as number), 'Spent']}
              />
              <Bar
                dataKey="amount"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Average Monthly Spending</p>
          <p className="text-xl font-bold">{formatter.format(avgSpending)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
