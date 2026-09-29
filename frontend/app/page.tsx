import Dashboard from '../../backend/dashboard-backup';
import LoginGate from './login-gate';
import { initialState } from '@/shared/model';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <LoginGate>
      <Dashboard seed={initialState(true)} />
    </LoginGate>
    
  );
}