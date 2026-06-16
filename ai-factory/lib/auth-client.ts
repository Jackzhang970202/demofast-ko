export interface ClientUser {
  id: string;
  name: string;
  role: 'admin' | 'user';
  avatar?: string;
}

export function getStoredUser(): ClientUser | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem('user');
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as ClientUser;
  } catch {
    return null;
  }
}

export function getAuthHeaders(user?: ClientUser | null): HeadersInit {
  const currentUser = user ?? getStoredUser();

  if (!currentUser?.id || !currentUser?.role) {
    return {};
  }

  return {
    'x-user-id': currentUser.id,
    'x-user-role': currentUser.role,
  };
}

export function getJsonAuthHeaders(user?: ClientUser | null): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...getAuthHeaders(user),
  };
}
