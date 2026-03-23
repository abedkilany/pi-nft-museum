'use client';

import { useEffect, useMemo, useState } from 'react';
import { piApiFetch } from '@/lib/pi-auth-client';
import { explainLogEntry, humanizeStatus, severityLabel, type DiagnosticSeverity } from '@/lib/debug-diagnostics';

type CheckCard = {
  key: string;
  label: string;
  endpoint: string;
  severity: DiagnosticSeverity;
  title: string;
  summary: string;
  details?: string[];
};

type RouteCheck = {
  path: string;
  status: number;
  ok: boolean;
  explanation: string;
};

type SystemLogEntry = {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  meta?: unknown;
};

function cardColor(severity: DiagnosticSeverity) {
  if (severity === 'ok') return 'rgba(72, 187, 120, 0.22)';
  if (severity === 'warning') return 'rgba(236, 201, 75, 0.22)';
  return 'rgba(255, 99, 132, 0.22)';
}

export default function DiagnosticsPage() {
  const [cards, setCards] = useState<CheckCard[]>([]);
  const [routeChecks, setRouteChecks] = useState<RouteCheck[]>([]);
  const [recentErrors, setRecentErrors] = useState<SystemLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setPageError('');

        const endpoints = [
          { key: 'health', label: 'حالة النشر', endpoint: '/api/debug/health' },
          { key: 'auth', label: 'تسجيل الدخول والصلاحيات', endpoint: '/api/debug/auth' },
          { key: 'db', label: 'قاعدة البيانات', endpoint: '/api/debug/db' },
          { key: 'admin', label: 'منطق لوحة الإدارة', endpoint: '/api/debug/admin' },
          { key: 'routes', label: 'المسارات المهمة', endpoint: '/api/debug/routes' },
        ];

        const responses = await Promise.all(endpoints.map(async (item) => {
          const response = await piApiFetch(item.endpoint, { cache: 'no-store' }).catch(() => null);
          if (!response) {
            return {
              ...item,
              payload: null,
              status: 0,
            };
          }
          const payload = await response.json().catch(() => null);
          return { ...item, payload, status: response.status };
        }));

        const nextCards: CheckCard[] = responses.map((entry) => {
          if (!entry.payload) {
            return {
              key: entry.key,
              label: entry.label,
              endpoint: entry.endpoint,
              severity: 'error',
              title: 'تعذر الوصول إلى هذا الفحص',
              summary: 'الفحص نفسه لم يجب. غالبًا يوجد انقطاع أو route غير متاح.',
            };
          }

          const severity = (entry.payload.severity as DiagnosticSeverity | undefined)
            || (entry.status >= 200 && entry.status < 300 ? 'ok' : 'error');

          const details: string[] = [];
          if (entry.key === 'health' && entry.payload?.deployment) {
            details.push(`البيئة الحالية: ${entry.payload.deployment.vercelEnv || 'غير معروفة'}`);
            details.push(`آخر commit منشور: ${entry.payload.deployment.gitCommitMessage || 'غير متاح'}`);
            details.push(`هل التوكن حاضر؟ ${entry.payload.request?.bearerTokenPresent ? 'نعم' : 'لا'}`);
          }
          if (entry.key === 'auth' && entry.payload?.user) {
            details.push(`المستخدم الحالي: ${entry.payload.user.username}`);
            details.push(`الدور الحالي: ${entry.payload.user.role}`);
            details.push(`عدد الصلاحيات المقروءة: ${entry.payload.user.permissionsCount}`);
          }
          if (entry.key === 'db' && entry.payload?.stats) {
            details.push(`عدد المستخدمين: ${entry.payload.stats.usersCount}`);
            details.push(`عدد الأدوار: ${entry.payload.stats.rolesCount}`);
            details.push(`عدد سجلات التدقيق: ${entry.payload.stats.auditCount}`);
          }
          if (entry.key === 'admin' && entry.payload?.visibility) {
            details.push(`لوحة الأدمن: ${entry.payload.visibility.dashboard ? 'يجب أن تظهر' : 'لن تظهر'}`);
            details.push(`قسم النظام: ${entry.payload.visibility.system ? 'يجب أن يظهر' : 'لن يظهر'}`);
            details.push(`Audit Trail: ${entry.payload.visibility.auditTrail ? 'يجب أن تعمل' : 'لن تعمل'}`);
          }
          if (entry.key === 'routes' && Array.isArray(entry.payload?.routes)) {
            details.push(...entry.payload.routes.map((route: RouteCheck) => `${route.path}: ${humanizeStatus(route.status)}`));
          }

          return {
            key: entry.key,
            label: entry.label,
            endpoint: entry.endpoint,
            severity,
            title: entry.payload?.title || (severity === 'ok' ? 'الفحص ناجح' : 'يوجد خلل يحتاج متابعة'),
            summary: entry.payload?.summary || 'لا يوجد شرح إضافي لهذا الفحص.',
            details,
          };
        });

        const routesPayload = responses.find((entry) => entry.key === 'routes')?.payload;
        const logsResponse = await piApiFetch('/api/admin/system/logs', { cache: 'no-store' }).catch(() => null);
        const logsPayload = logsResponse ? await logsResponse.json().catch(() => null) : null;
        const nextErrors = Array.isArray(logsPayload?.logs)
          ? logsPayload.logs.filter((log: SystemLogEntry) => log.level === 'error' || log.level === 'warn').slice(0, 8)
          : [];

        if (cancelled) return;
        setCards(nextCards);
        setRouteChecks(Array.isArray(routesPayload?.routes) ? routesPayload.routes : []);
        setRecentErrors(nextErrors);
      } catch (error) {
        console.error(error);
        if (!cancelled) setPageError('تعذر تحميل صفحة التشخيص.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const topIssue = useMemo(() => {
    const brokenRoute = routeChecks.find((route) => !route.ok);
    if (brokenRoute) return brokenRoute.explanation;
    const severe = cards.find((card) => card.severity === 'error') || cards.find((card) => card.severity === 'warning');
    return severe?.summary || 'لا يوجد خلل واضح الآن.';
  }, [cards, routeChecks]);

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Diagnostics</span>
            <h1>تشخيص مبسط وواضح</h1>
          </div>
          <p>هذه الصفحة لا تعرض كودًا تقنيًا فقط، بل تلخص لك أين توجد المشكلة وما معناها بشكل مباشر.</p>
        </div>
        <div className="card" style={{ padding: '16px', marginTop: '18px', borderColor: 'rgba(255,255,255,0.08)' }}>
          <strong style={{ display: 'block', marginBottom: '6px' }}>الخلاصة الحالية</strong>
          <p style={{ margin: 0, color: 'var(--muted)' }}>{loading ? 'جاري تحليل الحالة…' : topIssue}</p>
        </div>
      </section>

      {pageError ? <section className="card" style={{ padding: '18px', color: '#ffb4b4' }}>{pageError}</section> : null}

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
        {cards.map((card) => (
          <article key={card.key} className="card" style={{ padding: '18px', borderColor: cardColor(card.severity) }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>
              <strong>{card.label}</strong>
              <span className="pill">{severityLabel(card.severity)}</span>
            </div>
            <p style={{ margin: '0 0 8px' }}><strong>{card.title}</strong></p>
            <p style={{ margin: '0 0 12px', color: 'var(--muted)' }}>{card.summary}</p>
            <p style={{ margin: '0 0 8px', opacity: 0.7, fontSize: '13px' }}>{card.endpoint}</p>
            {card.details?.length ? (
              <div style={{ display: 'grid', gap: '6px' }}>
                {card.details.map((detail, index) => (
                  <p key={index} style={{ margin: 0, color: 'var(--muted)', fontSize: '14px' }}>• {detail}</p>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </section>

      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Routes</span>
            <h2 style={{ margin: 0 }}>فحص المسارات الأساسية</h2>
          </div>
          <p>هنا ستعرف فورًا هل المشكلة لأن route غير موجودة، أو لأن الصلاحيات تمنعها، أو لأن السيرفر نفسه تعطل.</p>
        </div>
        <div style={{ display: 'grid', gap: '12px' }}>
          {routeChecks.length === 0 ? <p style={{ margin: 0, color: 'var(--muted)' }}>لا توجد نتائج بعد.</p> : routeChecks.map((route) => (
            <div key={route.path} className="card" style={{ padding: '14px', borderColor: route.ok ? cardColor('ok') : cardColor(route.status === 403 || route.status === 401 ? 'warning' : 'error') }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <strong>{route.path}</strong>
                <span className="pill">{route.status || 'FAIL'}</span>
              </div>
              <p style={{ margin: '8px 0 0', color: 'var(--muted)' }}>{route.explanation}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card" style={{ padding: '24px' }}>
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Recent problems</span>
            <h2 style={{ margin: 0 }}>آخر الأخطاء والتحذيرات أثناء التصفح</h2>
          </div>
          <p>هذه القائمة تجمع أخطاء المتصفح وأخطاء السيرفر المسجلة حديثًا، مع شرح مبسط لمعناها.</p>
        </div>
        <div style={{ display: 'grid', gap: '12px' }}>
          {recentErrors.length === 0 ? <p style={{ margin: 0, color: 'var(--muted)' }}>لا توجد أخطاء مسجلة مؤخرًا.</p> : recentErrors.map((log, index) => (
            <article key={`${log.timestamp}-${index}`} className="card" style={{ padding: '14px', borderColor: cardColor(log.level === 'error' ? 'error' : 'warning') }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <strong>{log.message}</strong>
                <span className="pill">{log.level.toUpperCase()}</span>
              </div>
              <p style={{ margin: '0 0 8px', color: 'var(--muted)' }}>{explainLogEntry(log.message, log.level)}</p>
              <p style={{ margin: 0, fontSize: '13px', opacity: 0.7 }}>{new Date(log.timestamp).toLocaleString()}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
