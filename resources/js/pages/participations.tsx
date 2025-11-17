import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarIcon, Search, Filter, TrendingUp, TrendingDown, Clock, Trophy, Brain } from 'lucide-react'
import AppSidebarLayout from '@/layouts/app/app-sidebar-layout'

interface ParticipationStats {
  total_applications: number
  won_applications: number
  lost_applications: number
  pending_applications: number
  total_amount_bid: number
  total_amount_won: number
  recent_applications: any[]
}

interface Application {
  id: number
  buy_id: number
  supplier_bin_iin: string
  date_apply: string
  tender_info?: {
    number_anno: string
    name_ru: string
    name_kz: string
    total_sum: number
    ref_buy_status_id: number
    customer_name_ru: string
    publish_date: string
    end_date: string
  }
  app_lots?: Array<{
    id: number
    lot_id: number
    status_id: number
    price: number
    amount: number
    offers?: Array<{
      price: number
      amount: number
    }>
  }>
}

const statusMap: Record<number, { label: string; color: string }> = {
  1: { label: 'Подана', color: 'bg-blue-100 text-blue-800' },
  2: { label: 'Допущена', color: 'bg-yellow-100 text-yellow-800' },
  3: { label: 'Не допущена', color: 'bg-red-100 text-red-800' },
  4: { label: 'Победитель', color: 'bg-green-100 text-green-800' },
  5: { label: 'Отклонена', color: 'bg-gray-100 text-gray-800' },
}

export default function ParticipationsPage() {
  const [stats, setStats] = useState<ParticipationStats | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [supplierBin, setSupplierBin] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasSearched, setHasSearched] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isAutoLoaded, setIsAutoLoaded] = useState(false)

  // Отладка состояний
  useEffect(() => {
    console.log('State update:', {
      supplierBin,
      hasSearched,
      isInitialLoad,
      isAutoLoaded,
      loading,
      error,
      applicationsCount: applications.length
    })
  })

  // Загрузка конфигурации по умолчанию - выполняется только один раз
  useEffect(() => {
    const loadDefaultConfig = async () => {
      try {
        const response = await fetch('/api/config')
        if (response.ok) {
          const data = await response.json()
          if (data.default_supplier_bin && data.default_supplier_bin.trim()) {
            setSupplierBin(data.default_supplier_bin)
            setIsAutoLoaded(true)
            
            // Выполняем автоматический поиск
            setTimeout(async () => {
              setError(null)
              setPage(1)
              try {
                await Promise.all([
                  loadStats(data.default_supplier_bin),
                  loadParticipations(data.default_supplier_bin, 1, '', 'all', '', '')
                ])
                setHasSearched(true)
              } catch (error) {
                console.error('Auto search error:', error)
                setError('Ошибка автоматической загрузки данных')
              }
              setIsInitialLoad(false)
            }, 500)
          } else {
            setIsInitialLoad(false)
          }
        } else {
          setIsInitialLoad(false)
        }
      } catch (error) {
        console.error('Error loading config:', error)
        setIsInitialLoad(false)
      }
    }

    loadDefaultConfig()
  }, []) // Пустой массив зависимостей - выполняется только один раз

  const loadStats = useCallback(async (bin?: string) => {
    const binToUse = bin || supplierBin
    if (!binToUse) return

    try {
      const response = await fetch(`/api/participations/stats/overview?supplier_bin=${encodeURIComponent(binToUse)}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setStats(data.data)
        }
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }, [supplierBin])

  const loadParticipations = useCallback(async (bin?: string, pageNum?: number, query?: string, status?: string, dateFromFilter?: string, dateToFilter?: string) => {
    const binToUse = bin || supplierBin
    const pageToUse = pageNum ?? page
    const queryToUse = query ?? searchQuery
    const statusToUse = (status ?? statusFilter) === 'all' ? '' : (status ?? statusFilter)
    const dateFromToUse = dateFromFilter ?? dateFrom
    const dateToToUse = dateToFilter ?? dateTo
    
    if (!binToUse) return

    setLoading(true)
    try {
      const response = await fetch('/api/participations/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supplier_bin: binToUse,
          query: queryToUse,
          status: statusToUse,
          date_from: dateFromToUse,
          date_to: dateToToUse,
          page: pageToUse,
          limit: 20
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setApplications(data.data)
          setTotal(data.total)
          setError(null)
          setHasSearched(true)
        } else {
          setError(data.message)
        }
      } else {
        setError('Ошибка загрузки данных')
      }
    } catch (error) {
      setError('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }, [supplierBin, page, searchQuery, statusFilter, dateFrom, dateTo])

  const handleInitialSearch = useCallback(async () => {
    if (!supplierBin.trim()) {
      setError('Введите БИН/ИИН для поиска')
      return
    }

    setError(null)
    setPage(1)
    
    try {
      await Promise.all([
        loadStats(),
        loadParticipations()
      ])
    } catch (error) {
      console.error('Search error:', error)
      setError('Ошибка загрузки данных')
    }
  }, [supplierBin, loadStats, loadParticipations])

  const handleSearch = useCallback(async () => {
    if (!hasSearched) {
      setError('Сначала выполните поиск по БИН/ИИН')
      return
    }
    
    setError(null)
    setPage(1)
    await loadParticipations()
  }, [hasSearched, loadParticipations])

  // Пагинация
  useEffect(() => {
    if (hasSearched && supplierBin && page > 1) {
      loadParticipations()
    }
  }, [page])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU').format(amount) + ' тг'
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const getApplicationStatus = (app: Application) => {
    if (!app.app_lots?.length) return statusMap[1]
    
    // Проверяем статус лотов
    const hasWon = app.app_lots.some(lot => lot.status_id === 4)
    if (hasWon) return statusMap[4]
    
    const hasRejected = app.app_lots.some(lot => lot.status_id === 3 || lot.status_id === 5)
    if (hasRejected && !app.app_lots.some(lot => lot.status_id === 1 || lot.status_id === 2)) {
      return statusMap[3]
    }
    
    const hasAdmitted = app.app_lots.some(lot => lot.status_id === 2)
    if (hasAdmitted) return statusMap[2]
    
    return statusMap[1]
  }

  const getTotalBidAmount = (app: Application) => {
    if (!app.app_lots?.length) return 0
    return app.app_lots.reduce((total, lot) => total + (lot.amount || 0), 0)
  }

  return (
    <AppSidebarLayout>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Мои участия в тендерах</h1>
          <Button 
            onClick={() => window.location.href = '/ai-analysis'} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <Brain className="h-4 w-4" />
            ИИ Анализ и Советы
          </Button>
        </div>

        {/* Форма ввода БИН/ИИН */}
        <Card>
          <CardHeader>
            <CardTitle>Мои участия в тендерах</CardTitle>
          </CardHeader>
          <CardContent>
            {isInitialLoad ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Загрузка данных...</span>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-600">
                  БИН/ИИН: <span className="font-semibold">{supplierBin}</span>
                  {isAutoLoaded && (
                    <span className="text-xs text-green-600 ml-2">(загружен из конфигурации)</span>
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

      {/* Статистика */}
      {!isInitialLoad && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Всего заявок</p>
                  <p className="text-2xl font-bold">{stats.total_applications}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Trophy className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Выиграно</p>
                  <p className="text-2xl font-bold text-green-600">{stats.won_applications}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Проиграно</p>
                  <p className="text-2xl font-bold text-red-600">{stats.lost_applications}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Сумма выигранных</p>
                  <p className="text-lg font-bold text-yellow-600">
                    {formatCurrency(stats.total_amount_won)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

        {/* Фильтры */}
        {!isInitialLoad && hasSearched && supplierBin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Фильтры
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={async (e) => {
              e.preventDefault()
              await handleSearch()
            }}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Поиск</label>
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Название тендера, номер..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Статус</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Все статусы" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все статусы</SelectItem>
                      <SelectItem value="1">Подана</SelectItem>
                      <SelectItem value="2">Допущена</SelectItem>
                      <SelectItem value="3">Не допущена</SelectItem>
                      <SelectItem value="4">Победитель</SelectItem>
                      <SelectItem value="5">Отклонена</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Дата с</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Дата по</label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <Button type="submit" disabled={loading}>
                  <Search className="w-4 h-4 mr-2" />
                  {loading ? 'Применение...' : 'Применить фильтры'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

        {/* Таблица участий */}
        {!isInitialLoad && hasSearched && supplierBin && (
        <Card>
          <CardHeader>
            <CardTitle>Список участий</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-600">{error}</div>
            ) : applications.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Участия не найдены
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Номер объявления</TableHead>
                      <TableHead>Название тендера</TableHead>
                      <TableHead>Заказчик</TableHead>
                      <TableHead>Дата подачи</TableHead>
                      <TableHead>Сумма заявки</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Сумма тендера</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map((app) => {
                      const status = getApplicationStatus(app)
                      const bidAmount = getTotalBidAmount(app)
                      
                      return (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium">
                            {app.tender_info?.number_anno || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <p className="font-medium truncate">
                                {app.tender_info?.name_ru || 'Название не указано'}
                              </p>
                              {app.tender_info?.name_kz && (
                                <p className="text-sm text-gray-600 truncate">
                                  {app.tender_info.name_kz}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <p className="text-sm truncate">
                                {app.tender_info?.customer_name_ru || '-'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatDate(app.date_apply)}
                          </TableCell>
                          <TableCell>
                            {bidAmount > 0 ? formatCurrency(bidAmount) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge className={status.color}>
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {app.tender_info?.total_sum 
                              ? formatCurrency(app.tender_info.total_sum) 
                              : '-'
                            }
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                
                {/* Пагинация */}
                {total > 20 && (
                  <div className="flex justify-between items-center mt-4">
                    <p className="text-sm text-gray-600">
                      Показано {applications.length} из {total} записей
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={page <= 1}
                      >
                        Назад
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={applications.length < 20}
                      >
                        Далее
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      </div>
    </AppSidebarLayout>
  )
}
