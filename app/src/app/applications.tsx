import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { getMyApplications, type MyApplication } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { Button, Card, Screen, Txt } from '@/ui';

export default function ApplicationsScreen() {
  const { token } = useAuth();
  const { language } = useStore();
  const { c } = useTheme();
  const hi = language === 'hi';
  const [rows, setRows] = useState<MyApplication[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  async function load() {
    if (!token) { setBusy(false); return; }
    setBusy(true); setError(false);
    try { setRows(await getMyApplications(token, true)); }
    catch { setError(true); }
    finally { setBusy(false); }
  }
  useEffect(() => { load(); }, [token]);
  if (!language) return <Redirect href="/" />;
  const status: Record<string, string> = hi ? { APPLIED: 'आवेदन जमा हुआ', CONTACTED: 'संपर्क किया गया', SHORTLISTED: 'शॉर्टलिस्ट किए गए', PLACED: 'नियुक्ति हुई', REJECTED: 'चयन नहीं हुआ' } : { APPLIED: 'Application submitted', CONTACTED: 'Contacted', SHORTLISTED: 'Shortlisted', PLACED: 'Placed', REJECTED: 'Not selected' };
  return <Screen edges={['top']}><ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
    <Button variant="ghost" size="md" label={hi ? 'पीछे' : 'Back'} onPress={() => router.canGoBack() ? router.back() : router.replace('/main')} />
    <Txt variant="h2">{hi ? 'मेरे नौकरी के आवेदन' : 'My job applications'}</Txt>
    {!token ? <><Txt>{hi ? 'अपने आवेदन देखने के लिए लॉगिन करें।' : 'Sign in to view your applications.'}</Txt><Button label={hi ? 'लॉगिन करें' : 'Sign in'} onPress={() => router.push('/auth?returnTo=/applications')} /></> : <>
      <Txt tone="dim">{hi ? 'यहाँ सक्षम में जमा किए आवेदन दिखते हैं। बाहरी पोर्टल के आवेदन उसी पोर्टल पर ट्रैक करें।' : 'Applications submitted in Saksham appear here. Track external portal applications on that portal.'}</Txt>
      <Button variant="secondary" size="md" label={hi ? 'स्थिति अपडेट करें' : 'Refresh status'} disabled={busy} onPress={load} />
      {busy && <ActivityIndicator color={c.primary} />}
      {error && <Txt tone="dim">{hi ? 'आवेदन लोड नहीं हुए। फिर कोशिश करें।' : 'Could not load applications. Try again.'}</Txt>}
      {!busy && !error && rows.length === 0 && <Txt>{hi ? 'अभी कोई आवेदन नहीं है।' : 'No applications yet.'}</Txt>}
      {!error && rows.map(row => <Card key={row.jobPostingId} style={{ gap: 8 }}>
        <Txt variant="h2">{hi ? row.jobPosting.titleHindi ?? row.jobPosting.title : row.jobPosting.title}</Txt>
        <Txt tone="dim">{row.jobPosting.employerName}</Txt>
        <Txt tone="primary">{status[row.status] ?? row.status}</Txt>
        <Txt variant="caption">{new Date(row.createdAt).toLocaleDateString(hi ? 'hi-IN' : 'en-IN')}</Txt>
        {row.jobPosting.source === 'SAMPLE' && <Txt variant="caption" tone="dim">{hi ? 'डेमो आवेदन — यह असली नौकरी नहीं है।' : 'Demo application — this is not a real vacancy.'}</Txt>}
      </Card>)}
    </>}
  </ScrollView></Screen>;
}
