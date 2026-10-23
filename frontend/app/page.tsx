import { AuthenticatedReport } from '@/composition/authenticated-report';
export const dynamic = 'force-dynamic';
export default function Page() {
  return <AuthenticatedReport portalUrl={process.env.ECOSISTEMA_PUBLIC_URL || '/'} />;
}
