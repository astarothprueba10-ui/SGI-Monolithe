import React from 'react';
import {
  CarFront,
  Circle,
  DoorOpen,
  Droplets,
  Fence,
  FileCheck2,
  FileText,
  Flame,
  HeartHandshake,
  MapPin,
  Recycle,
  Route,
  ScrollText,
  ShieldCheck,
  Sun,
  ToyBrick,
  Trees,
  Trophy,
  Wallet } from
'lucide-react';

const registry: Record<string, React.ComponentType<{className?: string;strokeWidth?: number | string;}>> = {
  CarFront,
  DoorOpen,
  Droplets,
  Fence,
  FileCheck2,
  FileText,
  Flame,
  HeartHandshake,
  MapPin,
  Recycle,
  Route,
  ScrollText,
  ShieldCheck,
  Sun,
  ToyBrick,
  Trees,
  Volleyball: Trophy,
  Wallet
};

interface IconProps {
  name: string;
  className?: string;
  strokeWidth?: number | string;
}

export function Icon({ name, className, strokeWidth = 1.5 }: IconProps) {
  const Cmp = registry[name] ?? Circle;
  return <Cmp className={className} strokeWidth={strokeWidth} />;
}