interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface AchievementBadgeProps {
  achievement: Achievement;
}

export default function AchievementBadge({ achievement }: AchievementBadgeProps) {
  return (
    <div
      title={`${achievement.name}: ${achievement.description}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '8px',
        fontSize: '20px',
        cursor: 'pointer',
        transition: 'transform 0.2s',
        boxShadow: '0 2px 8px rgba(102, 126, 234, 0.2)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
      }}
    >
      {achievement.icon}
    </div>
  )
}
