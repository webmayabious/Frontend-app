import { Platform } from 'react-native';
import notifee from '@notifee/react-native';
import api from '../../api/AxiosInstance';
import store from '../../redux/store';

export async function syncBadge() {
  try {
    const res = await api.get('/api/pm/notificationUnreadDataCount');
    const d = res.data?.data || {};

    const count =
      Number(d.assigned_lead || 0) +
      Number(d.follow_up_date || 0) +
      Number(d.site_visit_date || 0);

    // ✅ Redux e rakho (Header e dekhabe) - Android + iOS dui-tei
    store.dispatch({ type: 'SET_UNREAD_COUNT', payload: count });

    // ✅ App icon badge shudhu iOS e
    if (Platform.OS === 'ios') {
      await notifee.setBadgeCount(count);
    }

    console.log('🎯 Badge Updated:', count);
    return count;
  } catch (err) {
    console.log('❌ syncBadge error:', err);
    return 0;
  }
}