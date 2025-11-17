import { useState, useEffect } from "react"
import { Head } from "@inertiajs/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { 
    Brain, 
    TrendingUp, 
    Target, 
    Users, 
    Calendar, 
    AlertTriangle, 
    CheckCircle, 
    Info,
    Lightbulb,
    BarChart3
} from "lucide-react"
import AuthenticatedLayout from "@/layouts/app/app-sidebar-layout"

interface AIAnalysis {
    summary: string
    recommendations: Array<{
        type: string
        title: string
        description: string
        priority: 'high' | 'medium' | 'low'
    }>
    statistics: {
        total_participations: number
        won_tenders: number
        win_rate: number
        avg_bid_amount: number
        total_bid_amount: number
        top_categories: Record<string, number>
        top_customers: Record<string, number>
        recent_participations: number
        activity_trend: string
    }
    market_insights: Array<{
        title: string
        description: string
        recommendation: string
    }>
    next_actions: Array<{
        action: string
        description: string
        deadline: string
    }>
}

export default function AIAnalysisPage() {
    const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [supplierBin, setSupplierBin] = useState<string>("")

    useEffect(() => {
        // Получаем BIN поставщика из конфигурации
        fetch('/api/config')
            .then(res => res.json())
            .then(data => {
                if (data.default_supplier_bin) {
                    setSupplierBin(data.default_supplier_bin)
                    // Автоматически запускаем анализ
                    performAnalysis(data.default_supplier_bin)
                }
            })
            .catch(err => console.error('Failed to load config:', err))
    }, [])

    const performAnalysis = async (bin?: string) => {
        const binToUse = bin || supplierBin
        if (!binToUse) {
            setError("БИН поставщика не указан")
            return
        }

        setLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/goszakup/ai/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                },
                body: JSON.stringify({
                    supplier_bin: binToUse,
                    tender_data: {}
                })
            })

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }

            const data = await response.json()
            setAnalysis(data.analysis)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ошибка при выполнении анализа')
        } finally {
            setLoading(false)
        }
    }

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'destructive'
            case 'medium': return 'default'
            case 'low': return 'secondary'
            default: return 'default'
        }
    }

    const getPriorityIcon = (type: string) => {
        switch (type) {
            case 'improvement': return <AlertTriangle className="h-4 w-4" />
            case 'success': return <CheckCircle className="h-4 w-4" />
            case 'activity': return <TrendingUp className="h-4 w-4" />
            case 'diversification': return <Target className="h-4 w-4" />
            case 'growth': return <BarChart3 className="h-4 w-4" />
            case 'relationship': return <Users className="h-4 w-4" />
            default: return <Info className="h-4 w-4" />
        }
    }

    return (
        <AuthenticatedLayout>
            <Head title="ИИ Анализ и Советы" />
            
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">ИИ Анализ и Советы</h1>
                        <p className="text-muted-foreground">
                            Интеллектуальный анализ ваших участий в тендерах с персональными рекомендациями
                        </p>
                    </div>
                    <Button 
                        onClick={() => performAnalysis()} 
                        disabled={loading || !supplierBin}
                        className="flex items-center gap-2"
                    >
                        <Brain className="h-4 w-4" />
                        {loading ? 'Анализируем...' : 'Обновить анализ'}
                    </Button>
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Ошибка</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {loading && (
                    <Card>
                        <CardContent className="flex items-center justify-center py-8">
                            <div className="text-center space-y-2">
                                <Brain className="h-8 w-8 animate-pulse mx-auto text-primary" />
                                <p>Анализируем ваши данные...</p>
                                <p className="text-sm text-muted-foreground">
                                    Это может занять несколько секунд
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {analysis && !loading && (
                    <Tabs defaultValue="overview" className="space-y-6">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="overview">Обзор</TabsTrigger>
                            <TabsTrigger value="recommendations">Рекомендации</TabsTrigger>
                            <TabsTrigger value="insights">Инсайты</TabsTrigger>
                            <TabsTrigger value="actions">Действия</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-6">
                            {/* Резюме */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Brain className="h-5 w-5" />
                                        Резюме анализа
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-lg">{analysis.summary}</p>
                                </CardContent>
                            </Card>

                            {/* Статистика */}
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">
                                            Участий в тендерах
                                        </CardTitle>
                                        <Target className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {analysis.statistics.total_participations}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            За последние месяцы: {analysis.statistics.recent_participations}
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">
                                            Процент выигрышей
                                        </CardTitle>
                                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {analysis.statistics.win_rate}%
                                        </div>
                                        <Progress value={analysis.statistics.win_rate} className="mt-2" />
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">
                                            Выиграно тендеров
                                        </CardTitle>
                                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {analysis.statistics.won_tenders}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            из {analysis.statistics.total_participations} участий
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">
                                            Средняя сумма
                                        </CardTitle>
                                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">
                                            {analysis.statistics.avg_bid_amount.toLocaleString()} ₸
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Тренд: {analysis.statistics.activity_trend}
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Топ категории и заказчики */}
                            <div className="grid gap-6 md:grid-cols-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Топ категории</CardTitle>
                                        <CardDescription>
                                            Наиболее активные направления
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {Object.entries(analysis.statistics.top_categories).map(([category, count]) => (
                                                <div key={category} className="flex justify-between items-center">
                                                    <span className="text-sm">{category}</span>
                                                    <Badge variant="outline">{count} участий</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Топ заказчики</CardTitle>
                                        <CardDescription>
                                            Частые партнеры
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {Object.entries(analysis.statistics.top_customers).slice(0, 3).map(([customer, count]) => (
                                                <div key={customer} className="flex justify-between items-center">
                                                    <span className="text-sm truncate pr-2">{customer}</span>
                                                    <Badge variant="outline">{count}</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="recommendations" className="space-y-4">
                            {analysis.recommendations.map((rec, index) => (
                                <Card key={index}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {getPriorityIcon(rec.type)}
                                                {rec.title}
                                            </div>
                                            <Badge variant={getPriorityColor(rec.priority)}>
                                                {rec.priority === 'high' ? 'Высокий' : 
                                                 rec.priority === 'medium' ? 'Средний' : 'Низкий'} приоритет
                                            </Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p>{rec.description}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </TabsContent>

                        <TabsContent value="insights" className="space-y-4">
                            {analysis.market_insights.map((insight, index) => (
                                <Card key={index}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Lightbulb className="h-5 w-5" />
                                            {insight.title}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="mb-3">{insight.description}</p>
                                        <div className="p-3 bg-muted rounded-lg">
                                            <p className="text-sm font-medium">Рекомендация:</p>
                                            <p className="text-sm">{insight.recommendation}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </TabsContent>

                        <TabsContent value="actions" className="space-y-4">
                            {analysis.next_actions.map((action, index) => (
                                <Card key={index}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-5 w-5" />
                                                {action.action}
                                            </div>
                                            <Badge variant="outline">{action.deadline}</Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p>{action.description}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </TabsContent>
                    </Tabs>
                )}
            </div>
        </AuthenticatedLayout>
    )
}
