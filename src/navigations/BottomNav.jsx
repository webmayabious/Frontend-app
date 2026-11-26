import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  Modal,
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

// Menu modal colors (same as first page's Project modal)
const MODAL_CARD_BG = '#21283a';

// "Menu" tab stays highlighted while one of these screens is open
const MENU_GROUP_ROUTES = ['NotificationScreen', 'DeveloperProject'];

// Items shown inside the Menu modal
const MENU_ITEMS = [
  { label: 'Notification', screen: 'NotificationScreen', icon: 'notifications-outline', lib: 'ion' },
  { label: 'Developer Project', screen: 'DeveloperProject', icon: 'domain', lib: 'mci' },
];

const BottomNav = ({ routeName }) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const userRole = useSelector(state => state.userRole);
  const isAdmin = userRole?.includes('ADMIN');
  const inTest = userRole?.includes('TEST ROLE');
  const isBusinessHead = userRole?.includes('BUSINESS HEAD');
  const isCITYHEAD = userRole?.includes('CITY HEAD');

  const [menuVisible, setMenuVisible] = useState(false);
  const menuFocused = MENU_GROUP_ROUTES.includes(routeName);

  const bottomPadding = Math.max(
    insets.bottom,
    Platform.OS === 'android' ? 8 : 12,
  );

  const goTo = screen => {
    setMenuVisible(false);
    navigation.navigate(screen);
  };

  return (
    <>
      <View
        style={[
          styles.bottomNav,
          {
            height: TAB_ICON_AREA + bottomPadding,
            paddingBottom: bottomPadding,
          },
        ]}
      >
        <NavItem icon="view-dashboard" label="Dashboard" screen="Dashboard2" routeName={routeName} />
        {(isAdmin || isBusinessHead || isCITYHEAD || inTest) && (
          <NavItem icon="account-switch" label="Change RM" screen="ChangeRM" routeName={routeName} />
        )}
        {/* Assign RM: hidden for TEST ROLE */}
        {(isAdmin || isBusinessHead || isCITYHEAD) && (
          <NavItem icon="account-details" label="Assign RM" screen="AssignRM" routeName={routeName} />
        )}

        <NavItem icon1="list-alt" label="Leads List" screen="LeadsListScreen" routeName={routeName} />

        {/* Menu: opens the bottom sheet (Notification / Developer Project) */}
        <NavItem
          icon="menu"
          label="Menu"
          isActive={menuFocused}
          onPress={() => setMenuVisible(true)}
        />
      </View>

      {/* ── Menu Modal (same look as first page's Project modal) ── */}
      <Modal
        visible={menuVisible}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setMenuVisible(false)}
      >
        {/* Dimmed background: tapping outside closes the modal */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
          style={styles.modalBackdrop}
        >
          {/* Card: stop propagation so taps inside don't close it */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {}}
            style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 12) + 20 }]}
          >
            <View style={styles.dragHandle} />

            <View style={styles.menuIconCircle}>
              <Icon name="menu" size={26} color="#ffffff" />
            </View>

            <Text style={styles.modalSubtitle}>Choose an option below to continue.</Text>

            {MENU_ITEMS.map(item => {
              const active = routeName === item.screen;
              return (
                <TouchableOpacity
                  key={item.screen}
                  activeOpacity={0.8}
                  onPress={() => goTo(item.screen)}
                  style={[styles.menuBtn, active && styles.menuBtnActive]}
                >
                  {item.lib === 'ion' ? (
                    <Icon2 name={item.icon} size={18} color="rgba(255,255,255,0.92)" style={styles.menuBtnIcon} />
                  ) : (
                    <Icon name={item.icon} size={18} color="rgba(255,255,255,0.92)" style={styles.menuBtnIcon} />
                  )}
                  <Text style={styles.menuBtnText}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}

            <View style={styles.modalDivider} />

            <TouchableOpacity
              onPress={() => setMenuVisible(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const NavItem = ({ icon, icon1, icon2, label, screen, routeName, isActive: activeProp, onPress }) => {
  const navigation = useNavigation();
  const isActive = activeProp !== undefined ? activeProp : routeName === screen;
  const color = isActive ? TAB_ACTIVE_COLOR : TAB_INACTIVE_COLOR;

  return (
    <TouchableOpacity
      style={styles.navItem}
      onPress={onPress || (() => navigation.navigate(screen))}
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

  // ── Menu modal ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    width: '100%',
    backgroundColor: MODAL_CARD_BG,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: 14,
  },
  menuIconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    backgroundColor: '#0c9ebe9d',
    padding: 10,
    borderRadius: 50,
  },
  modalSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 18,
    marginTop: 6,
  },
  menuBtn: {
    width: '100%',
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  menuBtnActive: {
    borderColor: TAB_ACTIVE_COLOR,
    backgroundColor: 'rgba(0,154,223,0.12)',
  },
  menuBtnIcon: { marginRight: 8 },
  menuBtnText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 15,
    fontWeight: '700',
  },
  modalDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 8,
  },
  cancelBtn: {
    width: '100%',
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#0779a5',
  },
  cancelBtnText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '700',
    textAlign: 'center',
  },
});