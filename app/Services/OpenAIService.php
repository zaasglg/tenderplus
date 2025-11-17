<?php

namespace App\Services;

use OpenAI;
use Illuminate\Support\Facades\Log;

class OpenAIService
{
    private $client;

    public function __construct()
    {
        $apiKey = config('services.openai.api_key');
        if ($apiKey && strlen($apiKey) > 10) {
            $this->client = OpenAI::client($apiKey);
        } else {
            $this->client = null;
            Log::warning('OpenAI API key not configured or invalid');
        }
    }

    /**
     * Генерация рекомендаций для участия в тендере
     */
    public function generateTenderRecommendations(array $lotData, array $userParticipationHistory = []): array
    {
        // Проверяем доступность OpenAI клиента
        if (!$this->client) {
            Log::info('OpenAI client not available, using fallback recommendations', [
                'lot_id' => $lotData['id'] ?? 'unknown'
            ]);
            return $this->getFallbackRecommendations($lotData, $userParticipationHistory);
        }

        try {
            $prompt = $this->buildTenderAnalysisPrompt($lotData, $userParticipationHistory);
            
            $response = $this->client->chat()->create([
                'model' => config('services.openai.model', 'gpt-3.5-turbo'),
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'Ты — эксперт по государственным закупкам в Казахстане. Анализируй тендеры и давай практические рекомендации для участия, учитывая историю участий пользователя. Отвечай на русском языке в формате JSON.'
                    ],
                    [
                        'role' => 'user', 
                        'content' => $prompt
                    ]
                ],
                'max_tokens' => 3000,
                'temperature' => 0.7,
            ]);

            $content = $response->choices[0]->message->content;
            
            // Пытаемся распарсить JSON ответ
            $decodedResponse = json_decode($content, true);
            
            if (json_last_error() === JSON_ERROR_NONE && is_array($decodedResponse)) {
                return $decodedResponse;
            }
            
            // Если не JSON, возвращаем базовую структуру с текстом
            return $this->parseTextResponseToStructure($content);
            
        } catch (\Exception $e) {
            Log::error('OpenAI API error', [
                'error' => $e->getMessage(),
                'lot_data' => $lotData
            ]);
            
            return $this->getFallbackRecommendations($lotData, $userParticipationHistory);
        }
    }

    /**
     * Построение промпта для анализа тендера
     */
    private function buildTenderAnalysisPrompt(array $lotData, array $userParticipationHistory = []): string
    {
        $amount = number_format($lotData['amount'] ?? 0, 0, ',', ' ') . ' ₸';
        $title = $lotData['name_ru'] ?? 'Не указано';
        $description = $lotData['description_ru'] ?? 'Описание отсутствует';
        $customer = $lotData['customer_name_ru'] ?? 'Не указан';
        $statusId = $lotData['ref_lot_status_id'] ?? 0;
        $isConstruction = $lotData['is_construction_work'] ?? false ? 'Да' : 'Нет';
        $isLightIndustry = $lotData['is_light_industry'] ?? false ? 'Да' : 'Нет';

        // Строим историю участий для контекста
        $historyContext = $this->buildParticipationHistoryContext($userParticipationHistory);

        return "
Проанализируй данный тендер и предоставь детальные рекомендации для участия, учитывая историю участий пользователя:

ИНФОРМАЦИЯ О ТЕНДЕРЕ:
- Название: {$title}
- Сумма: {$amount}
- Описание: {$description}
- Заказчик: {$customer}
- Статус ID: {$statusId}
- Строительные работы: {$isConstruction}
- Легкая промышленность: {$isLightIndustry}

{$historyContext}

ТРЕБУЕТСЯ АНАЛИЗ:
1. Оценка привлекательности лота с учетом опыта пользователя
2. Уровень ожидаемой конкуренции на основе предыдущих участий
3. Основные риски участия, специфичные для данного пользователя
4. Персонализированные рекомендации по подготовке заявки
5. Стратегические инсайты, основанные на паттернах успеха/неудач
6. План действий с приоритетами, учитывающий опыт пользователя

Верни ответ СТРОГО в следующем JSON формате:
{
  \"recommendations\": [
    {\"type\": \"тип\", \"title\": \"заголовок\", \"description\": \"персонализированное описание на основе истории\"}
  ],
  \"strategic_insights\": [
    {\"category\": \"категория\", \"insight\": \"инсайт с учетом опыта\", \"value\": \"ценность для данного пользователя\"}
  ],
  \"risk_assessment\": {
    \"risk_level\": \"уровень риска\",
    \"identified_risks\": [\"риски специфичные для данного пользователя\"],
    \"mitigation_advice\": \"совет с учетом предыдущего опыта\"
  },
  \"competition_analysis\": {
    \"attractiveness\": \"привлекательность для данного пользователя\",
    \"expected_competition\": \"уровень конкуренции\",
    \"market_insights\": \"анализ рынка с учетом истории участий\"
  },
  \"next_actions\": [
    {\"priority\": \"приоритет\", \"action\": \"действие с учетом опыта\", \"deadline\": \"срок\", \"description\": \"описание с персонализацией\"}
  ]
}";
    }

    /**
     * Построение контекста истории участий пользователя
     */
    private function buildParticipationHistoryContext(array $userParticipationHistory): string
    {
        if (empty($userParticipationHistory)) {
            return "ИСТОРИЯ УЧАСТИЙ: Новый пользователь без предыдущих участий в тендерах.";
        }

        $totalParticipations = count($userParticipationHistory);
        $successfulParticipations = array_filter($userParticipationHistory, function($participation) {
            return ($participation['supplier_status'] ?? '') === 'Выиграл';
        });
        $successfulCount = count($successfulParticipations);
        $successRate = $totalParticipations > 0 ? round(($successfulCount / $totalParticipations) * 100, 1) : 0;

        // Анализируем категории тендеров
        $categories = [];
        $averageAmounts = [];
        $customers = [];
        
        foreach ($userParticipationHistory as $participation) {
            // Собираем статистику по категориям
            $category = $this->extractTenderCategory($participation);
            if ($category) {
                $categories[$category] = ($categories[$category] ?? 0) + 1;
            }
            
            // Средние суммы
            if (isset($participation['amount']) && $participation['amount'] > 0) {
                $averageAmounts[] = $participation['amount'];
            }
            
            // Частые заказчики
            $customer = $participation['customer_name_ru'] ?? '';
            if ($customer) {
                $customers[$customer] = ($customers[$customer] ?? 0) + 1;
            }
        }

        $avgAmount = !empty($averageAmounts) ? array_sum($averageAmounts) / count($averageAmounts) : 0;
        $topCategory = !empty($categories) ? array_keys($categories, max($categories))[0] : 'Не определена';
        $topCustomer = !empty($customers) ? array_keys($customers, max($customers))[0] : 'Не определен';

        return "
ИСТОРИЯ УЧАСТИЙ ПОЛЬЗОВАТЕЛЯ:
- Общее количество участий: {$totalParticipations}
- Успешных участий: {$successfulCount}
- Процент успеха: {$successRate}%
- Основная категория участий: {$topCategory}
- Средняя сумма участий: " . number_format($avgAmount, 0, ',', ' ') . " ₸
- Частый заказчик: {$topCustomer}
- Опыт работы: " . ($totalParticipations > 10 ? 'Опытный участник' : ($totalParticipations > 3 ? 'Средний опыт' : 'Начинающий участник'));
    }

    /**
     * Извлечение категории тендера из данных участия
     */
    private function extractTenderCategory(array $participation): string
    {
        $title = strtolower($participation['name_ru'] ?? '');
        
        // Простая категоризация по ключевым словам
        if (strpos($title, 'строительств') !== false || strpos($title, 'ремонт') !== false) {
            return 'Строительство';
        } elseif (strpos($title, 'поставк') !== false || strpos($title, 'закуп') !== false) {
            return 'Поставки';
        } elseif (strpos($title, 'услуг') !== false || strpos($title, 'консультац') !== false) {
            return 'Услуги';
        } elseif (strpos($title, 'оборудован') !== false || strpos($title, 'техник') !== false) {
            return 'Оборудование';
        } else {
            return 'Прочее';
        }
    }

    /**
     * Парсинг текстового ответа в структуру
     */
    private function parseTextResponseToStructure(string $content): array
    {
        return [
            'recommendations' => [
                [
                    'type' => 'ai_generated',
                    'title' => 'Рекомендации от ИИ',
                    'description' => $content
                ]
            ],
            'strategic_insights' => [
                [
                    'category' => 'ИИ Анализ',
                    'insight' => 'Автоматический анализ',
                    'value' => substr($content, 0, 200) . '...'
                ]
            ],
            'risk_assessment' => [
                'risk_level' => 'Средний',
                'identified_risks' => ['Требуется дополнительный анализ'],
                'mitigation_advice' => 'Изучите детали тендера внимательно'
            ],
            'competition_analysis' => [
                'attractiveness' => 'Средняя',
                'expected_competition' => 'Средний',
                'market_insights' => 'Требуется дополнительный анализ рынка'
            ],
            'next_actions' => [
                [
                    'priority' => 'medium',
                    'action' => 'Изучить документацию',
                    'deadline' => 'В ближайшее время',
                    'description' => 'Детально изучите требования тендера'
                ]
            ]
        ];
    }

    /**
     * Резервные рекомендации при ошибке API
     */
    private function getFallbackRecommendations(array $lotData, array $userParticipationHistory = []): array
    {
        $amount = $lotData['amount'] ?? 0;
        $isConstruction = $lotData['is_construction_work'] ?? false;
        $title = $lotData['name_ru'] ?? 'Не указано';
        $customer = $lotData['customer_name_ru'] ?? 'Не указан';
        
        $recommendations = [];
        $insights = [];
        $risks = [];
        
        // Анализ суммы тендера
        if ($amount > 50000000) {
            $recommendations[] = [
                'type' => 'financial',
                'title' => 'Крупный тендер (' . number_format($amount, 0, ',', ' ') . ' ₸)',
                'description' => 'Высокая сумма тендера требует серьезной подготовки. Убедитесь в наличии достаточного обеспечения заявки и финансовых гарантий.'
            ];
            $risks[] = 'Высокие финансовые требования и обеспечение';
            $insights[] = [
                'category' => 'Финансы',
                'insight' => 'Высокобюджетный тендер',
                'value' => 'Сумма превышает 50 млн ₸ - требует особой подготовки'
            ];
        } elseif ($amount > 10000000) {
            $recommendations[] = [
                'type' => 'preparation',
                'title' => 'Средний тендер (' . number_format($amount, 0, ',', ' ') . ' ₸)',
                'description' => 'Тендер средней сложности. Тщательно изучите техническое задание и требования к участникам.'
            ];
            $insights[] = [
                'category' => 'Оценка',
                'insight' => 'Средний по сложности тендер',
                'value' => 'Сумма ' . number_format($amount, 0, ',', ' ') . ' ₸ - умеренная конкуренция'
            ];
        } else {
            $recommendations[] = [
                'type' => 'opportunity',
                'title' => 'Малый тендер (' . number_format($amount, 0, ',', ' ') . ' ₸)',
                'description' => 'Хорошая возможность для начинающих поставщиков или небольших компаний.'
            ];
            $insights[] = [
                'category' => 'Возможность',
                'insight' => 'Доступный тендер',
                'value' => 'Невысокие барьеры входа для малого бизнеса'
            ];
        }
        
        // Анализ типа закупки
        if ($isConstruction) {
            $recommendations[] = [
                'type' => 'technical',
                'title' => 'Строительные работы',
                'description' => 'Обязательно наличие строительных лицензий, квалифицированного персонала и опыта выполнения аналогичных работ.'
            ];
            $risks[] = 'Сложные технические и лицензионные требования';
            $insights[] = [
                'category' => 'Специализация',
                'insight' => 'Строительная отрасль',
                'value' => 'Требуются специальные лицензии и квалификация'
            ];
        }
        
        // Анализ истории участий
        if (!empty($userParticipationHistory)) {
            $historyCount = count($userParticipationHistory);
            $recommendations[] = [
                'type' => 'experience',
                'title' => 'Персональная рекомендация',
                'description' => "На основе вашей истории участия в {$historyCount} тендерах, рекомендуем применить проверенную стратегию подготовки документов и ценообразования."
            ];
            $insights[] = [
                'category' => 'Опыт',
                'insight' => 'Персонализированный анализ',
                'value' => "Учтены данные о {$historyCount} предыдущих участиях"
            ];
        } else {
            $recommendations[] = [
                'type' => 'first_time',
                'title' => 'Первое участие',
                'description' => 'Рекомендуем начать с тщательного изучения всех требований и консультации с опытными коллегами.'
            ];
        }
        
        // Анализ заказчика
        if (strpos(strtolower($customer), 'школа') !== false || strpos(strtolower($customer), 'образован') !== false) {
            $recommendations[] = [
                'type' => 'sector',
                'title' => 'Образовательная сфера',
                'description' => 'Заказчик из сферы образования. Особое внимание к качеству продукции и соответствию образовательным стандартам.'
            ];
            $insights[] = [
                'category' => 'Сектор',
                'insight' => 'Образование',
                'value' => 'Специфические требования к качеству и безопасности'
            ];
        } elseif (strpos(strtolower($customer), 'больниц') !== false || strpos(strtolower($customer), 'медицин') !== false) {
            $recommendations[] = [
                'type' => 'sector',
                'title' => 'Медицинская сфера',
                'description' => 'Заказчик из медицинской сферы. Критично важно соответствие медицинским и санитарным требованиям.'
            ];
            $insights[] = [
                'category' => 'Сектор',
                'insight' => 'Здравоохранение',
                'value' => 'Строгие требования к сертификации и качеству'
            ];
        }
        
        // Базовые рекомендации
        if (empty($recommendations)) {
            $recommendations[] = [
                'type' => 'general',
                'title' => 'Общие рекомендации',
                'description' => 'Внимательно изучите техническое задание, подготовьте все необходимые документы и рассчитайте конкурентную цену.'
            ];
        }
        
        return [
            'recommendations' => $recommendations,
            'strategic_insights' => $insights ?: [
                [
                    'category' => 'Анализ',
                    'insight' => 'Базовая оценка',
                    'value' => 'Анализ выполнен на основе доступных данных о тендере'
                ]
            ],
            'risk_assessment' => [
                'risk_level' => count($risks) > 1 ? 'Высокий' : (count($risks) > 0 ? 'Средний' : 'Низкий'),
                'identified_risks' => $risks ?: ['Стандартные риски участия в тендере'],
                'mitigation_advice' => count($risks) > 1 
                    ? 'Требуется особая осторожность и тщательная подготовка' 
                    : 'Подготовьтесь заранее и изучите все требования'
            ],
            'competition_analysis' => [
                'attractiveness' => $amount > 10000000 ? 'Высокая' : 'Средняя',
                'expected_competition' => $amount > 50000000 ? 'Высокий' : ($amount > 10000000 ? 'Средний' : 'Низкий'),
                'market_insights' => $amount > 50000000 
                    ? 'Ожидается высокая конкуренция среди крупных поставщиков'
                    : 'Умеренная конкуренция, хорошие шансы для подготовленных участников'
            ],
            'next_actions' => [
                [
                    'priority' => 'high',
                    'action' => 'Изучить техническое задание',
                    'deadline' => 'В течение 1-2 дней',
                    'description' => 'Детально проанализируйте все требования и условия участия'
                ],
                [
                    'priority' => 'medium',
                    'action' => 'Подготовить документы',
                    'deadline' => 'За 3-5 дней до окончания',
                    'description' => 'Соберите все необходимые документы согласно техническому заданию'
                ],
                [
                    'priority' => 'medium',
                    'action' => 'Рассчитать стоимость',
                    'deadline' => 'За 2-3 дня до окончания',
                    'description' => 'Проведите точный расчет стоимости с учетом всех требований'
                ]
            ]
        ];
    }
}
