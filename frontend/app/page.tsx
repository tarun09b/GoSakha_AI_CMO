import Dashboard from './dashboard';
import {initialState} from '@/shared/model';
export const dynamic='force-dynamic';
export default function Home(){return <Dashboard seed={initialState(true)}/>}
