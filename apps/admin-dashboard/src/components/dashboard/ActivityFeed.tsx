import React from 'react';
import { RECENT_ACTIVITY } from '../../data/dashboard';

export function ActivityFeed({ limit = 5 }: {limit?: number;}) {
  return (
    <ul className="divide-y divide-brand-50">
      {RECENT_ACTIVITY.slice(0, limit).map((item) =>
      <li key={item.id} className="flex gap-3 px-5 py-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-600">
            {item.initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] leading-snug text-brand-700">
              <span className="font-medium text-brand-900">{item.user}</span> {item.action}{' '}
              <span className="font-medium text-brand-800">{item.target}</span>
            </p>
            <p className="mt-0.5 text-[11px] text-brand-300">
              {item.module} · {item.time}
            </p>
          </div>
        </li>
      )}
    </ul>);

}