// Tipos específicos del módulo Dashboard

export interface DashboardStats {
  totalPlayers: number;
  totalStaff: number;
  upcomingMatches: number;
  upcomingTrainings: number;
  lastMatchResult?: {
    opponent: string;
    score: string;
    isWin: boolean;
  };
}

export interface DashboardCard {
  id: string;
  title: string;
  value: string | number;
  icon: string;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}
