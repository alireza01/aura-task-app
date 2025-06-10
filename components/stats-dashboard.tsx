"use client"

import type React from "react" // Ensure React is imported if JSX is used
import { useMemo } from 'react';
import { useTaskStore } from '@/stores/taskStore'; // Import the task store
import type { Task } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, ListChecks, Zap, TrendingUp, AlertCircle, Info } from 'lucide-react';

// Removed TaskDashboardProps as tasks will be fetched from the store

export default function StatsDashboard() {
  const tasks = useTaskStore((state) => state.tasks); // Get tasks from Zustand store

  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((task) => task.completed).length;
    const activeTasks = totalTasks - completedTasks;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Calculate average scores (optional, can be intensive)
    const highPriorityTasks = tasks.filter(task => !task.completed && (task.importance_score || 0) >= 15).length;
    const overdueTasks = tasks.filter(task => !task.completed && task.due_date && new Date(task.due_date) < new Date()).length; // Assuming due_date exists

    // More stats can be added here: e.g. tasks completed today, average completion time, etc.

    return {
      totalTasks,
      completedTasks,
      activeTasks,
      completionRate,
      highPriorityTasks,
      overdueTasks,
    };
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            آمار کلی
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-full text-center">
            <Info className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">هنوز وظیفه‌ای اضافه نشده است.</p>
            <p className="text-sm text-muted-foreground">وقتی وظایف خود را اضافه کنید، آمار شما در اینجا نمایش داده می‌شود.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            آمار کلی
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm font-medium">
            <span className="flex items-center">
              <ListChecks className="h-4 w-4 mr-2 text-primary" />
              وظایف فعال
            </span>
            <span>{stats.activeTasks}</span>
          </div>
          <div className="flex justify-between items-center text-sm font-medium">
            <span className="flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
              وظایf تکمیل شده
            </span>
            <span>{stats.completedTasks} از {stats.totalTasks}</span>
          </div>
        </div>

        <div className="space-y-2">
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-muted-foreground">نرخ تکمیل</span>
                <span className="text-sm font-bold text-primary">{stats.completionRate.toFixed(0)}%</span>
            </div>
            <Progress value={stats.completionRate} aria-label={`${stats.completionRate.toFixed(0)}% تکمیل شده`} />
        </div>

        {stats.highPriorityTasks > 0 && (
            <div className="flex items-center justify-between text-sm bg-secondary/30 p-3 rounded-md">
                <div className="flex items-center">
                    <Zap className="h-4 w-4 mr-2 text-yellow-500" />
                    <span>وظایف با اولویت بالا (فعال)</span>
                </div>
                <span className="font-semibold">{stats.highPriorityTasks}</span>
            </div>
        )}

        {stats.overdueTasks > 0 && (
           <div className="flex items-center justify-between text-sm bg-destructive/10 p-3 rounded-md">
                <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2 text-destructive" />
                    <span>وظایf سررسید گذشته</span>
                </div>
                <span className="font-semibold">{stats.overdueTasks}</span>
            </div>
        )}

        {/* Add more stats visualizations here */}
        {/* Example: A small bar chart for tasks per group, or tasks completed per day */}

      </CardContent>
    </Card>
  );
}
