import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Icon1 from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

const BottomNav = ({ routeName }) => {
  const userRole = useSelector(state => state.userRole);
  const isAdmin = userRole?.includes('ADMIN');
  const isRM = userRole?.includes('RM');
  const isBusinessHead = userRole?.includes('BUSINESS HEAD');
  const isCITYHEAD = userRole?.includes('CITY HEAD');

  return (
    <View style={styles.bottomNav}>
      <NavItem icon="view-dashboard" label="Dashboard" screen="Dashboard" routeName={routeName} />
      {(isAdmin || isBusinessHead || isCITYHEAD) && (
        <>
          <NavItem icon="account-switch" label="Change RM" screen="ChangeRM" routeName={routeName} />
          <NavItem icon="account-details" label="Assign RM" screen="AssignRM" routeName={routeName} />
        </>
      )}
      {/* <NavItem icon="bell" label="Notifications" screen="Notifications" routeName={routeName} /> */}
         <NavItem icon1="list-alt" label="Leads List" screen="LeadsListScreen" routeName={routeName} />
    </View>
  );
};

const NavItem = ({ icon, icon1,label, screen, routeName }) => {
  const navigation = useNavigation();
  const isActive = routeName === screen;

  return (
    <TouchableOpacity
      style={styles.navItem}
      onPress={() => navigation.navigate(screen)}
    >
     <View style={[styles.iconWrapper, isActive && styles.iconWrapperActive]}>
  {icon ? (
    <Icon
      name={icon}
      size={20}
      color={isActive ? '#00cfff' : '#cfd8dc'}
    />
  ) : (
    <Icon1
      name={icon1}
      size={20}
      color={isActive ? '#00cfff' : '#cfd8dc'}
    />
  )}
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
  paddingBottom:18,
  paddingTop:10,
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
  paddingVertical: 6,
  minWidth: 60,
},
iconWrapper: {
  width: 44,
  height: 30,
  borderRadius: 15,
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 4,
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
});