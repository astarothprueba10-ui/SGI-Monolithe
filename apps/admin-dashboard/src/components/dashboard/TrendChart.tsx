import React from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis } from
'recharts';

export interface SeriesConfig {
  key: string;
  label: string;
  type: 'bar' | 'line';
  color: string;
}

export function TrendChart({
  data,
  series,
  height = 260,
  valuePrefix = ''





}: {data: Array<Record<string, string | number>>;series: SeriesConfig[];height?: number;valuePrefix?: string;}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#E5EDF5" vertical={false} />
          <XAxis
            dataKey={Object.keys(data[0] ?? { month: '' })[0]}
            tickLine={false}
            axisLine={{ stroke: '#E5EDF5' }}
            tick={{ fontSize: 11, fill: '#6487AF' }} />
          
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#6487AF' }}
            width={56} />
          
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #E5EDF5',
              fontSize: 12,
              boxShadow: '0 8px 24px -6px rgba(13,31,51,.18)'
            }}
            formatter={(value: number, name: string) => [`${valuePrefix}${value}`, name]} />
          
          <Legend
            iconType="circle"
            iconSize={7}
            wrapperStyle={{ fontSize: 12, color: '#6487AF', paddingTop: 8 }} />
          
          {series.map((s) =>
          s.type === 'bar' ?
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={s.color}
            radius={[3, 3, 0, 0]}
            maxBarSize={26} /> :


          <Line
            key={s.key}
            dataKey={s.key}
            name={s.label}
            type="monotone"
            stroke={s.color}
            strokeWidth={2}
            dot={{ r: 2.5, strokeWidth: 0, fill: s.color }}
            activeDot={{ r: 4 }} />


          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>);

}