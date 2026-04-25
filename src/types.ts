/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'student' | 'management';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
  grade?: string;
  email?: string;
  status?: 'active' | 'inactive' | 'blocked' | 'banned';
}

export interface AuthUser extends User {
  password?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  cover: string;
  genre?: string;
  status: 'available' | 'borrowed';
  isReserved?: boolean;
  reservedById?: string;
  dueDate?: string;
  borrowerId?: string;
  borrowerName?: string;
  isOverdue?: boolean;
}

export interface Member {
  id: string;
  name: string;
  role: string;
  grade?: string;
  activeLoans: number;
  points: number;
  avatar: string;
  status: 'active' | 'inactive' | 'blocked' | 'banned';
}

export interface Activity {
  id: string;
  user: string;
  action: string;
  time: string;
  type: 'borrow' | 'return' | 'alert';
}

export interface LibraryConfig {
  name: string;
  openingHours: string;
  loanLimit: number;
  loanDuration: number;
  pointsPerOverdueDay: number;
  notificationsEnabled: boolean;
  backupFrequency: string;
}
