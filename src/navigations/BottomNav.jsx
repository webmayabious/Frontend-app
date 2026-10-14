import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Icon1 from 'react-native-vector-icons/MaterialIcons';
import Icon2 from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Same metrics/colors as the first page's bottom tab bar ───────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isSmallPhone = SCREEN_WIDTH < 360;
const isTablet = SCREEN_WIDTH >= 600;
const TAB_ICON_AREA = isSmallPhone ? 52 : isTablet ? 68 : 60;
const ICON_SIZE = isSmallPhone ? 20 : isTablet ? 28 : 24;
const LABEL_SIZE = isSmallPhone ? 8 : isTablet ? 11 : 9.5;
const TAB_ACTIVE_COLOR = '#009adfb8';
const TAB_INACTIVE_COLOR = 'rgba(255,255,255,0.80)';

const BottomNav = ({ routeName }) => {
  const insets = useSafeAreaInsets();
  const userRole = useSelector(state => state.userRole);
  const isAdmin = userRole?.includes('ADMIN');
  const isRM = userRole?.includes('RM');
  const isBusinessHead = userRole?.includes('BUSINESS HEAD');
  const isCITYHEAD = userRole?.includes('CITY HEAD');

  const bottomPadding = Math.max(
    insets.bottom,
    Platform.OS === 'android' ? 8 : 12,
  );

  return (
    <View
      style={[
        styles.bottomNav,
        {
          height: TAB_ICON_AREA + bottomPadding,
          paddingBottom: bottomPadding,
        },
      ]}
    >
      <NavItem icon="view-dashboard" label="Dashboard" screen="Dashboard" routeName={routeName} />
      {(isAdmin || isBusinessHead || isCITYHEAD) && (
        <>
          <NavItem icon="account-switch" label="Change RM" screen="ChangeRM" routeName={routeName} />
          <NavItem icon="account-details" label="Assign RM" screen="AssignRM" routeName={routeName} />
        </>
      )}

      <NavItem icon1="list-alt" label="Leads List" screen="LeadsListScreen" routeName={routeName} />
      {/* Same icon as the Notification screen header */}
      <NavItem icon2="notifications-outline" label="Notifications" screen="NotificationScreen" routeName={routeName} />
    </View>
  );
};

const NavItem = ({ icon, icon1, icon2, label, screen, routeName }) => {
  const navigation = useNavigation();
  const isActive = routeName === screen;
  const color = isActive ? TAB_ACTIVE_COLOR : TAB_INACTIVE_COLOR;

  return (
    <TouchableOpacity
      style={styles.navItem}
      onPress={() => navigation.navigate(screen)}
      activeOpacity={0.7}
    >
      <View style={styles.iconWrapper}>
        {icon ? (
          <Icon name={icon} size={ICON_SIZE} color={color} />
        ) : icon1 ? (
          <Icon1 name={icon1} size={ICON_SIZE} color={color} />
        ) : (
          <Icon2 name={icon2} size={ICON_SIZE} color={color} />
        )}
      </View>
      <Text
        numberOfLines={1}
        style={[
          styles.navText,
          { color, fontWeight: isActive ? '900' : '400' },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export default BottomNav;

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#1f2e50',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.10)',
    paddingTop: 6,
    paddingHorizontal: isTablet ? 32 : 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 10 },
    }),
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  iconWrapper: {
    width: ICON_SIZE + 10,
    height: ICON_SIZE + 10,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  navText: {
    width: '100%',
    textAlign: 'center',
    fontSize: LABEL_SIZE,
    letterSpacing: 0.2,
    marginTop: 2,
  },
});