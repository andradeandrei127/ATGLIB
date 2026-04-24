import { Book, Member, Activity } from './types';

export const MOCK_BOOKS: Book[] = [];

export const MOCK_MEMBERS: Member[] = [];

export const MOCK_ACTIVITIES: Activity[] = [];

export const LOAN_DATA: { name: string; value: number }[] = [];

export const COMMON_GENRES = [
  'Ficção',
  'Romance',
  'Suspense',
  'Terror',
  'Aventura',
  'Fantasia',
  'Biografia',
  'História',
  'Ciência',
  'Autoajuda',
  'Didático',
  'Poesia',
  'Quadrinhos',
  'Outros'
];

export const LIBRARY_CONFIG = {
  name: 'Biblioteca AtgLib',
  openingHours: '08:00 - 18:00',
  loanLimit: 5,
  loanDuration: 15,
  pointsPerOverdueDay: 3,
  notificationsEnabled: true,
  backupFrequency: 'Diário'
};

export const PREDEFINED_AVATARS = [
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Felix',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Shadow',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Jasper',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Luna',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Max',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Bella',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=Charlie',
];
