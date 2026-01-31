interface RoleTagProps {
  role: string;
}

const roleColors: Record<string, { bg: string; text: string }> = {
  admin: { bg: 'bg-red-100', text: 'text-red-800' },
  owner: { bg: 'bg-purple-100', text: 'text-purple-800' },
  leader: { bg: 'bg-blue-100', text: 'text-blue-800' },
  member: { bg: 'bg-gray-100', text: 'text-gray-800' },
  free_user: { bg: 'bg-gray-100', text: 'text-gray-800' },
  standard_employee: { bg: 'bg-green-100', text: 'text-green-800' },
  team_leader: { bg: 'bg-blue-100', text: 'text-blue-800' },
};

export function RoleTag({ role }: RoleTagProps) {
  const colors = roleColors[role] || { bg: 'bg-gray-100', text: 'text-gray-800' };
  const displayRole = role.replace(/_/g, ' ');

  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${colors.bg} ${colors.text}`}>
      {displayRole}
    </span>
  );
}
