import { Box, Typography, Card, CardContent } from '@mui/material';

export function HistoryPage() {
  // TODO: 從 API 取得歷史訂單
  const orders = [
    { id: '1', date: '2025-12-26', from: '台中市西屯區', to: '台中市北區', fare: 150 },
    { id: '2', date: '2025-12-25', from: '台中市南屯區', to: '台中市西區', fare: 120 },
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        歷史行程
      </Typography>

      {orders.map((order) => (
        <Card key={order.id} sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                {order.date}
              </Typography>
              <Typography color="primary" fontWeight="bold">
                ${order.fare}
              </Typography>
            </Box>
            <Typography variant="body2">
              📍 {order.from}
            </Typography>
            <Typography variant="body2">
              🎯 {order.to}
            </Typography>
          </CardContent>
        </Card>
      ))}

      {orders.length === 0 && (
        <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
          還沒有行程記錄
        </Typography>
      )}
    </Box>
  );
}
