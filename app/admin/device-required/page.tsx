import { redirect } from 'next/navigation';

export default function LegacyAdminDeviceRequiredPage() {
  redirect('/admin-session-required?reason=secure_session_failed');
}
