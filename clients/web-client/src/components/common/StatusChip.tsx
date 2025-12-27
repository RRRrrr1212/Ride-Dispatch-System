import { Chip } from '@mui/material';
import type { OrderStatus } from '../../types';

interface StatusChipProps {
  status: OrderStatus;
}

const statusConfig: Record<OrderStatus, { label: string; color: 'warning' | 'info' | 'primary' | 'success' | 'error' }> = {
  PENDING: { label: '等待中', color: 'warning' },
  ACCEPTED: { label: '已接單', color: 'info' },
  ONGOING: { label: '行程中', color: 'primary' },
  COMPLETED: { label: '已完成', color: 'success' },
  CANCELLED: { label: '已取消', color: 'error' },
};

export function StatusChip({ status }: StatusChipProps) {
  const config = statusConfig[status];

  return (
    <Chip
      label={config.label}
      color={config.color}
      size="small"
      data-testid="status-chip"
    />
  );
}
