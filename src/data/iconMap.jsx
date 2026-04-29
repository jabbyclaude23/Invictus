// src/data/iconMap.js
import {
  Dumbbell,
  Droplet,
  Book,
  Moon,
  Coffee,
  Heart,
  Flame,
  Timer,
  PenTool,
  Brain,
  Briefcase,
  Clock,
  Headphones,
  Utensils,
  Shield,
  Smile,
  DollarSign,
  Scale,
  Footprints,
  Zap,
  BarChart3,
  Trash2,
  CheckSquare,
} from "lucide-react";

export const iconMap = {
  workout: <Dumbbell size={20} />,
  water: <Droplet size={20} />,
  steps: <Footprints size={20} />,
  weight: <Scale size={20} />,
  burn: <Flame size={20} />,
  sleep: <Moon size={20} />,
  fasting: <Timer size={20} />,
  focus: <Brain size={20} />,
  mood: <Smile size={20} />,
  energy: <Zap size={20} />,
  read: <Book size={20} />,
  gratitude: <CheckSquare size={20} />,
  meditate: <Headphones size={20} />,
  coffee: <Coffee size={20} />,
  eat: <Utensils size={20} />,
  nojunk: <Shield size={20} />,
  money: <DollarSign size={20} />,
  work: <Briefcase size={20} />,
  time: <Clock size={20} />,
  heart: <Heart size={20} />,
  custom: <PenTool size={20} />,
  chart: <BarChart3 size={20} />,
  delete: <Trash2 size={20} />,
};

// Optional helper for dynamic icon rendering
export const getIcon = (item) => {
  if (!item) return iconMap.custom;
  if (item.icon && iconMap[item.icon]) return iconMap[item.icon];
  return iconMap.custom;
};
