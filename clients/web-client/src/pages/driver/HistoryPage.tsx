import { Box, Typography, Card, CardContent } from '@mui/material';

export function HistoryPage() {
  const trips = [
    { id: '1', date: '2025-12-26', from: '西屯區', to: '北屯區', fare: 150, status: '已完成' },
    { id: '2', date: '2025-12-25', from: '南屯區', to: '西區', fare: 120, status: '已完成' },
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        歷史行程
      </Typography>

      {trips.map((trip) => (
        <Card key={trip.id} sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                {trip.date}
              </Typography>
              <Typography color="primary" fontWeight="bold">
                ${trip.fare}
              </Typography>
            </Box>
            <Typography variant="body2">
              📍 {trip.from} → 🎯 {trip.to}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
