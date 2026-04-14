import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';

const BottomNav = () => {
  const userRole = useSelector(state => state.userRole);
  const isAdmin = userRole?.includes('ADMIN');
  const isRM = userRole?.includes('RM');
  const isBusinessHead=userRole?.includes('BUSINESS HEAD')
  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <View style={styles.bottomNav}>
        <NavItem icon="view-dashboard" label="Dashboard" screen="Dashboard" />
         {(isAdmin || isBusinessHead)&&(
          <>
         
            <NavItem icon="account-switch" label="Change RM" screen="ChangeRM" />
            <NavItem icon="account-details" label="Assign RM" screen="AssignRM" />
          </>
        )}



        {/* COMMON */}
        
        <NavItem icon="bell" label="Notifications" screen="Notifications" />
      </View>
    </SafeAreaView>
  );
};

const NavItem = ({ icon, label, screen }) => {
  const navigation = useNavigation();
  const route = useRoute();
  const isActive = route.name === screen;

  return (
    <TouchableOpacity
      style={[styles.navItem, isActive && styles.navItemActive]}
      onPress={() => screen && navigation.navigate(screen)}
    >
      <View style={[styles.iconWrapper, isActive && styles.iconWrapperActive]}>
        <Icon name={icon} size={20} color={isActive ? '#00cfff' : '#cfd8dc'} />
      </View>
      <Text style={[styles.navText, isActive && styles.navTextActive]}>
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
    paddingVertical: 8,
    backgroundColor: '#2B2E81',
    borderTopWidth: 1,
    borderTopColor: '#ffffff15',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    elevation: 10,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  navItemActive: {
    // outer wrapper active style not needed
  },
  iconWrapper: {
    width: 42,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconWrapperActive: {
    backgroundColor: '#ffffff18',
  },
  navText: {
    color: '#cfd8dc',
    fontSize: 10,
    marginTop: 1,
  },
  navTextActive: {
    color: '#00cfff',
    fontWeight: '600',
  },
  safeArea: {
    backgroundColor: '#2B2E81',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    overflow: 'hidden',
  },
});
