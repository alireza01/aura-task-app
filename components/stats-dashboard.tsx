"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { Task } from "@/types"
import { CheckCircle2, Clock, Star, TrendingUp, Calendar, Target, Zap, Award } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface StatsDashboardProps {
  tasks: Task[]
}

export default function StatsDashboard({ tasks }: StatsDashboardProps) {
  const stats = useMemo(() => {
    const totalTasks = tasks.length
    const completedTasks = tasks.filter((t) => t.completed).length
    const activeTasks = totalTasks - completedTasks
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

    const highPriorityTasks = tasks.filter((t) => (t.importance_score || 0) >= 15).length
    const todayTasks = tasks.filter((t) => {
      const today = new Date()
      const taskDate = new Date(t.created_at)
      return today.toDateString() === taskDate.toDateString()
    }).length

    const avgImportance =
      tasks.length > 0 ? tasks.reduce((sum, t) => sum + (t.importance_score || 0), 0) / tasks.length : 0

    const avgSpeed = tasks.length > 0 ? tasks.reduce((sum, t) => sum + (t.speed_score || 0), 0) / tasks.length : 0

    return {
      totalTasks,
      completedTasks,
      activeTasks,
      completionRate,
      highPriorityTasks,
      todayTasks,
      avgImportance,
      avgSpeed,
    }
  }, [tasks])

  const statCards = [
    {
      title: "کل وظایف",
      value: stats.totalTasks,
      icon: Target,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      delay: 0.1,
    },
    {
      title: "تکمیل شده",
      value: stats.completedTasks,
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      delay: 0.2,
    },
    {
      title: "در انتظار",
      value: stats.activeTasks,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
      delay: 0.3,
    },
    {
      title: "اولویت بالا",
      value: stats.highPriorityTasks,
      icon: Star,
      color: "text-red-600",
      bgColor: "bg-red-100 dark:bg-red-900/30",
      delay: 0.4,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((stat) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: stat.delay }}
          >
            <Card className="glass-card border-0 hover-lift">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <div className={cn("p-2 rounded-lg", stat.bgColor)}>
                    <stat.icon className={cn("w-4 h-4", stat.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Completion Rate */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card className="glass-card border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              نرخ تکمیل
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>پیشرفت کلی</span>
              <span className="font-medium">{Math.round(stats.completionRate)}%</span>
            </div>
            <Progress value={stats.completionRate} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {stats.completedTasks} از {stats.totalTasks} وظیفه تکمیل شده
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Today's Tasks */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <Card className="glass-card border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              وظایف امروز
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">{stats.todayTasks}</div>
              <p className="text-xs text-muted-foreground">وظیفه برای امروز</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Performance Metrics */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
        <Card className="glass-card border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" />
              عملکرد
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Star className="w-3 h-3 text-yellow-500" />
                  <span>میانگین اهمیت</span>
                </div>
                <span className="font-medium">{Math.round(stats.avgImportance)}/20</span>
              </div>
              <Progress value={(stats.avgImportance / 20) * 100} className="h-1.5" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-blue-500" />
                  <span>میانگین سرعت</span>
                </div>
                <span className="font-medium">{Math.round(stats.avgSpeed)}/20</span>
              </div>
              <Progress value={(stats.avgSpeed / 20) * 100} className="h-1.5" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
        <Card className="glass-card border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">خلاصه</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• {stats.activeTasks} وظیفه در انتظار انجام</p>
              <p>• {stats.highPriorityTasks} وظیفه با اولویت بالا</p>
              <p>• {Math.round(stats.completionRate)}% نرخ تکمیل</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
