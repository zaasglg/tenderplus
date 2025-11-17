import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface LotDetailsModalProps {
  lot: any;
  visible: boolean;
  onClose: () => void;
}

const getStatusText = (statusId: number | string | undefined): string => {
  const id = typeof statusId === 'string' ? parseInt(statusId) : statusId;
  switch (id) {
    case 200: return 'Создан';
    case 210: return 'Опубликован';
    case 220: return 'Прием заявок';
    case 230: return 'Рассмотрение заявок';
    case 240: return 'Отменен';
    case 250: return 'Определен победитель';
    case 260: return 'Заключен договор';
    case 270: return 'Исполнен';
    case 280: return 'Расторгнут';
    case 290: return 'Архив';
    case 300: return 'Несостоявшийся';
    case 310: return 'Повторно объявлен';
    case 320: return 'Приостановлен';
    case 330: return 'Возобновлен';
    case 340: return 'На согласовании';
    case 350: return 'Отклонен';
    case 360: return 'Подписан';
    case 370: return 'На доработке';
    case 380: return 'Ожидает подписания';
    default: return id ? `Статус ${id}` : 'Неизвестно';
  }
};

const LotDetailsModal: React.FC<LotDetailsModalProps> = ({ lot, visible, onClose }) => {
  if (!lot) return null;
  const statusId = lot.refLotStatusId || lot.ref_lot_status_id;
  return (
    <Dialog open={visible} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{lot.nameRu || 'Детали лота'}</DialogTitle>
        </DialogHeader>
        <div style={{ marginBottom: 8 }}>
          <b>Номер лота:</b> {lot.lotNumber || lot.lot_number}
        </div>
        <div style={{ marginBottom: 8 }}>
          <b>Цена:</b> {lot.amount?.toLocaleString() || lot.amount}
        </div>
        <div style={{ marginBottom: 8 }}>
          <b>БИН заказчика:</b> {lot.customerBin || lot.customer_bin}
        </div>
        <div style={{ marginBottom: 8 }}>
          <b>Описание:</b> {lot.descriptionRu || lot.description_ru}
        </div>
        <div style={{ marginBottom: 8 }}>
          <b>Статус:</b> {getStatusText(statusId)}
        </div>
        <div style={{ marginBottom: 8 }}>
          <b>Дата обновления:</b> {lot.lastUpdateDate || lot.last_update_date}
        </div>
        {/* Добавьте другие поля по необходимости */}
        <DialogFooter>
          <Button onClick={onClose} variant="outline">Закрыть</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LotDetailsModal;
