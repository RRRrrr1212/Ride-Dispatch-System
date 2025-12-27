import { Box, Typography, Card, CardContent } from '@mui/material';

export function RatePlansPage() {
  // TODO: 從 API 取得費率設定
  const ratePlans = [
    { vehicleType: 'STANDARD', baseFare: 50, perKmRate: 15, perMinRate: 3, minFare: 70 },
    { vehicleType: 'PREMIUM', baseFare: 80, perKmRate: 25, perMinRate: 5, minFare: 120 },
    { vehicleType: 'XL', baseFare: 100, perKmRate: 30, perMinRate: 6, minFare: 150 },
  ];

  const vehicleLabels: Record<string, string> = {
    STANDARD: '🚗 菁英',
    PREMIUM: '🚘 尊榮',
    XL: '🚐 大型',
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        費率設定
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {ratePlans.map((plan) => (
          <Box key={plan.vehicleType} sx={{ flex: '1 1 300px', maxWidth: { md: '33%' } }}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {vehicleLabels[plan.vehicleType] || plan.vehicleType}
                </Typography>

                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    基本費
                  </Typography>
                  <Typography>${plan.baseFare}</Typography>
                </Box>

                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    每公里
                  </Typography>
                  <Typography>${plan.perKmRate}</Typography>
                </Box>

                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    每分鐘
                  </Typography>
                  <Typography>${plan.perMinRate}</Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    最低車資
                  </Typography>
                  <Typography>${plan.minFare}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
