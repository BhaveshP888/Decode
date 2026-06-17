import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Activity, History } from 'lucide-react'
import HistoryClient, { DBScan } from '@/components/history-client'
import Navbar from '@/components/navbar'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const scans = await prisma.scan.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      ingredients: {
        include: {
          ingredient: true
        }
      }
    }
  })

  const exposures = await prisma.exposureTracking.findMany({
    where: { userId: user.id },
    orderBy: { exposureCount: 'desc' },
    include: {
      ingredient: true
    }
  })

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-indigo-500/30">
      <Navbar />
      <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-12 space-y-8">
        
        <header className="space-y-2">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full text-sm font-medium border border-indigo-500/20 mb-4">
            <Activity className="w-4 h-4" />
            <span>Health Analytics</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">Your Exposure Profile</h1>
          <p className="text-zinc-400 text-lg max-w-2xl">
            Track your cumulative exposure to ingredients over time. See what you&apos;re actually consuming and identify patterns.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Top Exposures */}
          <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl shadow-2xl">
            <CardHeader>
              <CardTitle className="text-zinc-100 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-400" />
                Top Ingredients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {exposures.map((exp: (typeof exposures)[number]) => (
                    <div key={exp.id} className="flex items-center justify-between p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/50 hover:border-zinc-700 transition-colors">
                      <div>
                        <h4 className="font-semibold text-zinc-100">{exp.ingredient.name}</h4>
                        <div className="text-xs text-zinc-500 capitalize flex items-center gap-2 mt-1">
                          <span className={
                            exp.ingredient.riskLevel === 'high' ? 'text-red-400' :
                            exp.ingredient.riskLevel === 'moderate' ? 'text-yellow-400' : 'text-green-400'
                          }>
                            {exp.ingredient.riskLevel} risk
                          </span>
                          <span>•</span>
                          <span>{exp.ingredient.category}</span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 text-sm">
                        {exp.exposureCount}x
                      </Badge>
                    </div>
                  ))}
                  {exposures.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-40 text-zinc-500 space-y-2">
                      <Activity className="w-8 h-8 opacity-20" />
                      <p>No exposure data yet.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Recent Scans */}
          <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl shadow-2xl">
            <CardHeader>
              <CardTitle className="text-zinc-100 flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-400" />
                Recent Scans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <HistoryClient scans={scans as unknown as DBScan[]} />
              </ScrollArea>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
