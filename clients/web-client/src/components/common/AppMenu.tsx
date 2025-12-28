import { useState, type ReactNode } from 'react';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
} from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';

// 選單項目的介面
export interface AppMenuItem {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  color?: string; // 可選的顏色，例如 '#ff5252' 用於登出
  dividerBefore?: boolean; // 在此項目前顯示分隔線
}

interface AppMenuProps {
  userName: string;
  userRating?: string;
  menuItems: AppMenuItem[];
}

/**
 * 共用的漢堡選單組件
 * 統一乘客端和司機端的選單樣式
 */
export function AppMenu({ userName, userRating = '5.0 ★', menuItems }: AppMenuProps) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(e.currentTarget);
  };

  const handleClose = () => {
    setMenuAnchor(null);
  };

  const handleItemClick = (onClick: () => void) => {
    handleClose();
    onClick();
  };

  return (
    <>
      {/* 漢堡選單按鈕 */}
      <IconButton
        onClick={handleOpen}
        sx={{
          bgcolor: 'white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          '&:hover': { bgcolor: '#f5f5f5' },
          width: 44,
          height: 44,
        }}
      >
        <MenuIcon sx={{ color: '#1a1a1a' }} />
      </IconButton>

      {/* 選單內容 */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            borderRadius: 3,
            minWidth: 220,
            maxWidth: 220,
            mt: 1,
            boxShadow: 8,
            bgcolor: '#2a2a2a',
            color: 'white',
          }
        }}
      >
        {/* 用戶資訊區塊 */}
        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ color: 'white' }}>
            {userName}
          </Typography>
          <Typography variant="caption" sx={{ color: 'grey.400' }}>
            {userRating}
          </Typography>
        </Box>

        {/* 選單項目 */}
        {menuItems.map((item, index) => (
          <Box key={index}>
            {item.dividerBefore && (
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
            )}
            <MenuItem
              onClick={() => handleItemClick(item.onClick)}
              sx={{
                py: 1.5,
                color: item.color || 'white',
              }}
            >
              <ListItemIcon sx={{ color: item.color || 'grey.300' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </MenuItem>
          </Box>
        ))}
      </Menu>
    </>
  );
}
