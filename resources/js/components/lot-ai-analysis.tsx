import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
    Brain, 
    AlertTriangle, 
    TrendingUp, 
    Target, 
    CheckCircle, 
    Clock,
    DollarSign,
    Users,
    FileText,
    Lightbulb,
    X
} from 'lucide-react';
import { goszakupProxyApi } from '@/lib/goszakup-proxy-api';
import type { Lot } from '@/types';

interface LotAIAnalysisProps {
    lot: Lot;
    className?: string;
}

interface LotAnalysis {
    basic_info: {
        title: string;
        amount: number;
        amount_formatted: string;
        customer: string;
        status: string;
        size_category: string;
        lot_number: string;
        announcement_number: string;
    };
    competition_level: {
        attractiveness: string;
        expected_competition: string;
        complexity_factors: string[];
        entry_barriers: number;
        recommendation: string;
        trade_method?: string;
        market_segment?: string;
        ai_insights?: string;
        ai_attractiveness?: string;
        ai_competition?: string;
    };
    risk_assessment: {
        risk_level: string;
        identified_risks: string[];
        mitigation_advice: string;
        ai_risk_level?: string;
        ai_mitigation_advice?: string;
    };
    recommendations: Array<{
        type: string;
        title: string;
        description: string;
    }>;
    strategic_insights: Array<{
        category: string;
        insight: string;
        value: string;
    }>;
    next_actions: Array<{
        priority: string;
        action: string;
        deadline: string;
        description: string;
    }>;
}

export default function LotAIAnalysis({ lot, className }: LotAIAnalysisProps) {
    const [analysis, setAnalysis] = useState<LotAnalysis | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const analyizeLot = async () => {
        if (analysis) {
            setIsDialogOpen(true);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await goszakupProxyApi.analyzeLot(lot);
            
            if (response.success) {
                setAnalysis(response.analysis);
                setIsDialogOpen(true);
            } else {
                throw new Error(response.error || 'Ошибка анализа');
            }
        } catch (err) {
            console.error('Error analyzing lot:', err);
            setError(err instanceof Error ? err.message : 'Ошибка при анализе лота');
            setIsDialogOpen(true); // Показываем диалог с ошибкой
        } finally {
            setLoading(false);
        }
    };

    const getRiskColor = (level: string) => {
        switch (level.toLowerCase()) {
            case 'низкий': return 'bg-green-500';
            case 'средний': return 'bg-yellow-500';
            case 'высокий': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority.toLowerCase()) {
            case 'urgent': return 'destructive';
            case 'high': return 'default';
            case 'medium': return 'secondary';
            default: return 'outline';
        }
    };

    const getCompetitionProgress = (level: string) => {
        switch (level.toLowerCase()) {
            case 'низкий': return 25;
            case 'средний': return 50;
            case 'высокий': return 75;
            default: return 50;
        }
    };

    if (!isDialogOpen) {
        return (
            <Button 
                onClick={analyizeLot} 
                disabled={loading}
                variant="outline" 
                size="sm"
                className={`flex items-center gap-1 border-gray-300 hover:border-primary hover:bg-primary/10 transition-colors duration-150 px-3 py-1 text-[13px] rounded ${className}`}
            >
                <Brain className={`w-4 h-4 mr-1 text-primary ${loading ? 'animate-pulse' : ''}`} />
                {loading ? 'Анализ...' : 'ИИ Анализ'}
            </Button>
        );
    }

    return (
        <>
            <Button 
                onClick={analyizeLot} 
                disabled={loading}
                variant="outline" 
                size="sm"
                className={`flex items-center gap-1 border-gray-300 hover:border-primary hover:bg-primary/10 transition-colors duration-150 px-3 py-1 text-[13px] rounded ${className}`}
            >
                <Brain className={`w-4 h-4 mr-1 text-primary ${loading ? 'animate-pulse' : ''}`} />
                {loading ? 'Анализ...' : 'ИИ Анализ'}
            </Button>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent 
                    className="p-0 !max-w-none !w-[95vw] !h-[95vh] !max-h-none flex flex-col"
                    style={{
                        width: '95vw',
                        height: '95vh',
                        maxWidth: 'none',
                        maxHeight: 'none'
                    }}
                >
                    <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle className="flex items-center gap-2 text-xl">
                                    <Brain className="h-6 w-6 text-blue-600" />
                                    ИИ Анализ Лота
                                    <Badge variant="secondary" className="text-sm">Персонализированный</Badge>
                                </DialogTitle>
                                <DialogDescription className="text-base mt-2">
                                    Интеллектуальный анализ тендера с учетом вашей истории участий для оптимальной стратегии
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {error && (
                        <div className="mx-6 p-4 border-l-4 border-red-500 bg-red-50">
                            <div className="flex items-center gap-2 text-red-600">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="text-sm">{error}</span>
                            </div>
                        </div>
                    )}

                    {loading && (
                        <div className="p-8 mx-6 space-y-4">
                            <Skeleton className="h-8 w-64" />
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-32 w-full" />
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </div>
                    )}

                    {analysis && (
                        <div className="px-8 pb-8 flex-1 flex flex-col">
                            <Tabs defaultValue="overview" className="w-full flex flex-col flex-1">
                                <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
                                    <TabsTrigger value="overview" className="text-base py-3">Обзор</TabsTrigger>
                                    <TabsTrigger value="competition" className="text-base py-3">Конкуренция</TabsTrigger>
                                    <TabsTrigger value="risks" className="text-base py-3">Риски</TabsTrigger>
                                    <TabsTrigger value="actions" className="text-base py-3">Действия</TabsTrigger>
                                </TabsList>

                    <div className="flex-1 overflow-y-auto pt-6">
                        <TabsContent value="overview" className="space-y-6 m-0">
                            {/* Базовая информация */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-xl">Базовая информация</CardTitle>
                                </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <p className="font-medium text-base">Размер тендера</p>
                                        <Badge variant="outline" className="text-sm">{analysis.basic_info.size_category}</Badge>
                                    </div>
                                    <div>
                                        <p className="font-medium text-base">Сумма</p>
                                        <p className="text-xl font-bold text-green-600">
                                            {analysis.basic_info.amount_formatted}
                                        </p>
                                    </div>
                                </div>
                                {/* <div>
                                    <p className="font-medium text-base">Статус</p>
                                    <Badge className="text-sm">{analysis.basic_info.status}</Badge>
                                </div> */}
                            </CardContent>
                        </Card>

                        {/* Рекомендации */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <Lightbulb className="h-6 w-6" />
                                    Персонализированные рекомендации
                                    <Badge variant="secondary" className="text-xs">На основе вашей истории</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {analysis.recommendations && analysis.recommendations.length > 0 ? (
                                    analysis.recommendations.map((rec, index) => (
                                        <div key={index} className="border-l-4 border-blue-500 pl-6 py-2">
                                            <h4 className="font-medium text-base">{rec.title}</h4>
                                            <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 bg-gray-50 rounded-lg text-center">
                                        <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
                                            <Brain className="h-5 w-5" />
                                            <span className="text-sm font-medium">ИИ анализирует ваш профиль...</span>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            Рекомендации будут готовы в течение нескольких секунд
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Стратегические инсайты */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <TrendingUp className="h-6 w-6" />
                                    Стратегические инсайты
                                    <Badge variant="outline" className="text-xs">Адаптированы под ваш опыт</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {analysis.strategic_insights && analysis.strategic_insights.length > 0 ? (
                                    analysis.strategic_insights.map((insight, index) => (
                                        <div key={index} className="p-4 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Badge variant="outline" className="text-sm">{insight.category}</Badge>
                                                <span className="font-medium text-base">{insight.insight}</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground">{insight.value}</p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="flex items-center gap-1">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse delay-75"></div>
                                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-150"></div>
                                            </div>
                                            <span className="text-sm font-medium text-gray-700">
                                                Анализ работы с заказчиком: {analysis.basic_info?.customer || 'Загрузка...'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-600">
                                            Изучите историю тендеров данного заказчика для понимания предпочтений
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="competition" className="space-y-6 m-0">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <Users className="h-6 w-6" />
                                    Анализ конкуренции
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="font-medium text-base">Уровень конкуренции</span>
                                        <Badge className="text-sm">{analysis.competition_level.expected_competition}</Badge>
                                    </div>
                                    <Progress 
                                        value={getCompetitionProgress(analysis.competition_level.expected_competition)} 
                                        className="h-3"
                                    />
                                </div>

                                <div>
                                    <p className="font-medium text-base mb-3">Привлекательность лота</p>
                                    <div className="flex gap-3">
                                        <Badge variant="outline" className="text-sm">{analysis.competition_level.attractiveness}</Badge>
                                        {analysis.competition_level.ai_attractiveness && (
                                            <Badge variant="secondary" className="text-sm">ИИ: {analysis.competition_level.ai_attractiveness}</Badge>
                                        )}
                                    </div>
                                </div>

                                {analysis.competition_level.trade_method && (
                                    <div>
                                        <p className="font-medium text-base mb-3">Способ закупки</p>
                                        <Badge variant="outline" className="text-sm">{analysis.competition_level.trade_method}</Badge>
                                    </div>
                                )}

                                {analysis.competition_level.market_segment && (
                                    <div>
                                        <p className="font-medium text-base mb-3">Сегмент рынка</p>
                                        <Badge variant="outline" className="text-sm">{analysis.competition_level.market_segment}</Badge>
                                    </div>
                                )}

                                {analysis.competition_level.ai_insights && (
                                    <div className="p-4 bg-blue-50 rounded-lg">
                                        <h4 className="font-medium text-blue-800 mb-2 text-base">Инсайты от ИИ</h4>
                                        <p className="text-sm text-blue-700">{analysis.competition_level.ai_insights}</p>
                                    </div>
                                )}

                                <div>
                                    <p className="font-medium text-base mb-3">Барьеры входа</p>
                                    <div className="space-y-3">
                                        {analysis.competition_level.complexity_factors.map((factor, index) => (
                                            <div key={index} className="flex items-center gap-3 p-2 bg-yellow-50 rounded">
                                                <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                                                <span className="text-sm">{factor}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                                        <p className="text-sm">{analysis.competition_level.recommendation}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="risks" className="space-y-6 m-0">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <AlertTriangle className="h-6 w-6" />
                                    Оценка рисков
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-4 h-4 rounded-full ${getRiskColor(analysis.risk_assessment.risk_level)}`}></div>
                                        <span className="font-medium text-base">Базовая оценка:</span>
                                        <Badge className="text-sm">{analysis.risk_assessment.risk_level}</Badge>
                                    </div>
                                    {analysis.risk_assessment.ai_risk_level && (
                                        <div className="flex items-center gap-3">
                                            <div className={`w-4 h-4 rounded-full ${getRiskColor(analysis.risk_assessment.ai_risk_level)}`}></div>
                                            <span className="font-medium text-base">ИИ оценка:</span>
                                            <Badge variant="secondary" className="text-sm">{analysis.risk_assessment.ai_risk_level}</Badge>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <p className="font-medium text-base mb-3">Выявленные риски</p>
                                    <div className="space-y-3">
                                        {analysis.risk_assessment.identified_risks.map((risk, index) => (
                                            <div key={index} className="flex items-start gap-3 p-3 bg-red-50 rounded">
                                                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                                                <span className="text-sm">{risk}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="p-4 bg-green-50 rounded-lg">
                                        <h4 className="font-medium text-green-800 mb-2 text-base">Базовый совет по управлению рисками</h4>
                                        <p className="text-sm text-green-700">{analysis.risk_assessment.mitigation_advice}</p>
                                    </div>
                                    
                                    {analysis.risk_assessment.ai_mitigation_advice && (
                                        <div className="p-4 bg-blue-50 rounded-lg">
                                            <h4 className="font-medium text-blue-800 mb-2 text-base">Совет от ИИ</h4>
                                            <p className="text-sm text-blue-700">{analysis.risk_assessment.ai_mitigation_advice}</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="actions" className="space-y-6 m-0">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-xl flex items-center gap-2">
                                    <Target className="h-6 w-6" />
                                    План действий
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {analysis.next_actions.map((action, index) => (
                                    <div key={index} className="border rounded-lg p-5">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-medium text-base">{action.action}</h4>
                                            <Badge variant={getPriorityColor(action.priority)} className="text-sm">
                                                {action.priority === 'urgent' ? 'Срочно' : 
                                                 action.priority === 'high' ? 'Высокий' : 
                                                 action.priority === 'medium' ? 'Средний' : 'Низкий'}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                                            <Clock className="h-4 w-4" />
                                            <span>{action.deadline}</span>
                                        </div>
                                        <p className="text-sm leading-relaxed">{action.description}</p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    </div>
                            </Tabs>
                        </div>
                    )}
                    </DialogContent>
                </Dialog>
            </>
        );
}
