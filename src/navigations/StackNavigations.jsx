// import React from 'react';
// import { NavigationContainer } from '@react-navigation/native';
// import { createNativeStackNavigator } from '@react-navigation/native-stack';
// import Dashboard from '../pages/Dashboard';
// import FollowUpsScreen from '../pages/FollowUpsScreen';
// import AllInteractionsScreen from '../pages/AllInteractionsScreen';
// import LoginUI from '../login/Login';
// import MeetingsEdit from '../pages/MeetingsEdit';
// import SiteVisitsScreen from '../pages/SiteVisitsScreen';
// import AddNewInteraction from '../pages/AddNewInteraction';
// import MissedFollowup from '../pages/MissedFollowup';
// import UploadedLeads from '../pages/UploadedLeads';
// import TotalLeadScreen from '../pages/TotalLeadScreen';
// import LeadsListScreen from '../pages/LeadsListScreen';
// import TotalBookingsAgreementsTillDateScreen from '../pages/TotalBookingsAgreementsTillDateScreen';
// import TotalBookingsAgreementsPerMonth from '../pages/TotalBookingsAgreementsPerMonth';
// import AssignRM from '../pages/AssignRM';
// import ChangeRM from '../pages/ChangeRM';
// import BookingDetailScreen from '../pages/BookingDetailScreen';
// import LeadsassignedScreen from '../pages/LeadsassignedScreen';
// import Rmform from '../pages/Rmform';
// import SplashScreen from '../Layout/SplashScreen';
// import { View } from 'react-native';
// import Header from '../Layout/Header';
// import BottomNav from './BottomNav';
// import { useNavigationState } from '@react-navigation/native';
// const Stack = createNativeStackNavigator();
// export default function StackNavigations() {
//   return (
//     <NavigationContainer>
//       <View style={{ flex: 1 }}>
//         {/* 🔥 Header once */}
//         <Header />
//         <View style={{ flex: 1 }}>
//           <Stack.Navigator screenOptions={{ headerShown: false }}>
//             {/* <Stack.Screen
//           name="Splash"
//           component={SplashScreen}
//             options={{ headerShown: false }}
//         /> */}
//             <Stack.Screen name="Login" component={LoginUI} />
//             <Stack.Screen name="Dashboard" component={Dashboard} />

//             <Stack.Screen name="FollowUpsScreen" component={FollowUpsScreen} />
//             <Stack.Screen
//               name="AllInteractionsScreen"
//               component={AllInteractionsScreen}
//             />
//             <Stack.Screen name="MeetingsEdit" component={MeetingsEdit} />
//             <Stack.Screen
//               name="SiteVisitsScreen"
//               component={SiteVisitsScreen}
//             />
//             <Stack.Screen
//               name="AddNewInteraction"
//               component={AddNewInteraction}
//             />
//             <Stack.Screen name="MissedFollowup" component={MissedFollowup} />
//             <Stack.Screen name="UploadedLeads" component={UploadedLeads} />
//             <Stack.Screen name="TotalLeadScreen" component={TotalLeadScreen} />
//             <Stack.Screen name="LeadsListScreen" component={LeadsListScreen} />
//             <Stack.Screen
//               name="TotalBookingsAgreementsTillDateScreen"
//               component={TotalBookingsAgreementsTillDateScreen}
//             />
//             <Stack.Screen
//               name="TotalBookingsAgreementsPerMonth"
//               component={TotalBookingsAgreementsPerMonth}
//             />

//             <Stack.Screen name="AssignRM" component={AssignRM} />
//             <Stack.Screen name="ChangeRM" component={ChangeRM} />
//             <Stack.Screen
//               name="BookingDetailScreen"
//               component={BookingDetailScreen}
//             />
//             <Stack.Screen
//               name="LeadsassignedScreen"
//               component={LeadsassignedScreen}
//             />
//             <Stack.Screen name="Rmform" component={Rmform} />
//           </Stack.Navigator>
//         </View>
//         <BottomNav />
//       </View>
//     </NavigationContainer>
//   );
// }
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
const Stack = createNativeStackNavigator();

export default function StackNavigations() {
  const navigationRef = createNavigationContainerRef();

  const [isReady, setIsReady] = useState(false);
  const [currentRoute, setCurrentRoute] = useState('');
  const [hideBottomNav, setHideBottomNav] = useState(false);
  return (
    // <NavigationContainer
    //   ref={navigationRef}
    //   onReady={() => {
    //     setCurrentRoute(navigationRef.getCurrentRoute()?.name);
    //   }}
    //   onStateChange={() => {
    //     setCurrentRoute(navigationRef.getCurrentRoute()?.name);
    //   }}
    // >
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
      <View style={{ flex: 1, backgroundColor: '#070c4d' }}>
        {/* HEADER */}
        {/* {currentRoute !== 'Login' && <Header routeName={currentRoute} />} */}
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
            <Stack.Screen name="AssignRM" component={AssignRM} />
            <Stack.Screen name="FollowUpsScreen" component={FollowUpsScreen} />
            <Stack.Screen
              name="AllInteractionsScreen"
              component={AllInteractionsScreen}
            />
            <Stack.Screen name="MeetingsEdit" component={MeetingsEdit} />
            <Stack.Screen
              name="SiteVisitsScreen"
              component={SiteVisitsScreen}
            />
            <Stack.Screen
              name="AddNewInteraction"
              component={AddNewInteraction}
            />
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

            <Stack.Screen
              name="BookingDetailScreen"
              component={BookingDetailScreen}
            />
            <Stack.Screen
              name="LeadsassignedScreen"
              component={LeadsassignedScreen}
            />
            <Stack.Screen name="Rmform" component={Rmform} />
          </Stack.Navigator>
        </View>

        {/* BOTTOM NAV */}
        {/* {currentRoute !== 'Login' && <BottomNav routeName={currentRoute} />} */}
        {isReady && currentRoute !== 'Login' && !hideBottomNav && (
          <BottomNav routeName={currentRoute} />
        )}
      </View>
    </NavigationContainer>
  );
}
