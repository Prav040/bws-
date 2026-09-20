// src/components/TabBar.ts
// Gemeinsame Bottom-Tab-Bar (Workouts / Verlauf / Statistik / Profil) – Mockup-konform.

export type TabId = 'workouts' | 'history' | 'stats' | 'profile';

export interface TabBarActions {
  onWorkouts: () => void;
  onHistory: () => void;
  onStats: () => void;
  onProfile: () => void;
}

export function tabBarHtml(active: TabId, actions: TabBarActions): string {
  const tabs: Array<{ id: TabId; icon: string; label: string; action: () => void }> = [
    { id: 'workouts', icon: '🏋️', label: 'Workouts', action: actions.onWorkouts },
    { id: 'history', icon: '📋', label: 'Verlauf', action: actions.onHistory },
    { id: 'stats', icon: '📊', label: 'Statistik', action: actions.onStats },
    { id: 'profile', icon: '👤', label: 'Profil', action: actions.onProfile },
  ];

  return `
    <nav class="tab-bar" aria-label="Hauptnavigation">
      <div class="tab-bar-inner">
        ${tabs
          .map(
            (t) => `
            <button data-tab="${t.id}" class="tab-btn ${t.id === active ? 'tab-active' : ''}"
              aria-current="${t.id === active ? 'page' : 'false'}">
              <span class="tab-icon" aria-hidden="true">${t.icon}</span>
              <span>${t.label}</span>
            </button>`,
          )
          .join('')}
      </div>
    </nav>
  `;
}

export function bindTabBar(container: HTMLElement, actions: TabBarActions): void {
  const handlers: Record<TabId, () => void> = {
    workouts: actions.onWorkouts,
    history: actions.onHistory,
    stats: actions.onStats,
    profile: actions.onProfile,
  };

  container.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).getAttribute('data-tab') as TabId;
      handlers[id]?.();
    });
  });
}
