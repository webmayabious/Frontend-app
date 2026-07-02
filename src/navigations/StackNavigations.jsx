import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Header from '../Layout/Header';
import BottomNav from './BottomNav';

import LoginUI from '../login/Login';
import Dashboard from '../pages/Dashboard';
import ChangeRM from '../pages/ChangeRM';
import AssignRM from '../pages/AssignRM';
import FollowUpsScreen from '../pages/FollowUpsScreen';
import AllInteractionsScreen from '../pages/AllInteractionsScreen';
import MeetingsEdit from '../pages/MeetingsEdit';
import SiteVisitsScreen from '../pages/SiteVisitsScreen';
import AddNewInteraction from '../pages/AddNewInteraction';
import MissedFollowup from '../pages/MissedFollowup';
import UploadedLeads from '../pages/UploadedLeads';
import TotalLeadScreen from '../pages/TotalLeadScreen';
import LeadsListScreen from '../pages/LeadsListScreen';
import TotalBookingsAgreementsTillDateScreen from '../pages/TotalBookingsAgreementsTillDateScreen';
import TotalBookingsAgreementsPerMonth from '../pages/TotalBookingsAgreementsPerMonth';
import BookingDetailScreen from '../pages/BookingDetailScreen';
import LeadsassignedScreen from '../pages/LeadsassignedScreen';
import Rmform from '../pages/Rmform';
import NotificationScreen from '../pages/Notification/Notificationscreen'
import Totalleadscreen1 from '../pages/Totalleadscreen1'
const Stack = createNativeStackNavigator();

// Screens where BottomNav should NOT show
const NO_BOTTOM_NAV_SCREENS = ['Login'];

export default function StackNavigations() {
  const navigationRef = createNavigationContainerRef();
  const [isReady, setIsReady] = useState(false);
  const [currentRoute, setCurrentRoute] = useState('');
  const [hideBottomNav, setHideBottomNav] = useState(false);

  const showBottomNav =
    isReady &&
    !NO_BOTTOM_NAV_SCREENS.includes(currentRoute) &&
    !hideBottomNav;

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        setIsReady(true);
        setCurrentRoute(navigationRef.getCurrentRoute()?.name || '');
      }}
      onStateChange={() => {
        const route = navigationRef.getCurrentRoute();
        setCurrentRoute(route?.name || '');
      }}
    >
      {/* Root container — position relative so absolute children work */}
      <View style={{ flex: 1, backgroundColor: '#070c4d' }}>

        {/* HEADER */}
        {isReady && currentRoute !== 'Login' && (
          <Header routeName={currentRoute} />
        )}

        {/* SCREENS */}
        <View style={{ flex: 1 }}>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginUI} />
            <Stack.Screen name="Dashboard" component={Dashboard} />
            <Stack.Screen name="ChangeRM">
              {props => (
                <ChangeRM {...props} setHideBottomNav={setHideBottomNav} />
              )}
            </Stack.Screen>
            <Stack.Screen name="AssignRM">
              {props => (
                <AssignRM {...props} setHideBottomNav={setHideBottomNav} />
              )}
            </Stack.Screen>
            <Stack.Screen name="FollowUpsScreen" component={FollowUpsScreen} />
            <Stack.Screen name="AllInteractionsScreen" component={AllInteractionsScreen} />
            <Stack.Screen name="MeetingsEdit" component={MeetingsEdit} />
            <Stack.Screen name="SiteVisitsScreen" component={SiteVisitsScreen} />
            <Stack.Screen name="AddNewInteraction" component={AddNewInteraction} />
            <Stack.Screen name="MissedFollowup" component={MissedFollowup} />
            <Stack.Screen name="UploadedLeads" component={UploadedLeads} />
            <Stack.Screen name="TotalLeadScreen" component={TotalLeadScreen} />
            <Stack.Screen name="LeadsListScreen" component={LeadsListScreen} />
            <Stack.Screen
              name="TotalBookingsAgreementsTillDateScreen"
              component={TotalBookingsAgreementsTillDateScreen}
            />
            <Stack.Screen
              name="TotalBookingsAgreementsPerMonth"
              component={TotalBookingsAgreementsPerMonth}
            />
            <Stack.Screen name="BookingDetailScreen" component={BookingDetailScreen} />
            <Stack.Screen name="LeadsassignedScreen" component={LeadsassignedScreen} />
            <Stack.Screen name="Rmform" component={Rmform} />
            <Stack.Screen name="Totalleadscreen1" component={Totalleadscreen1} />
            <Stack.Screen name="NotificationScreen" component={NotificationScreen} />
          </Stack.Navigator>
        </View>

        {/* ✅ BOTTOM NAV — absolute fixed, no glitch */}
        {showBottomNav && (
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 99,
          }}>
            <BottomNav routeName={currentRoute} />
          </View>
        )}

      </View>
    </NavigationContainer>
  );
}