import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Dashboard from "../pages/Dashboard";
import FollowUpsScreen from "../pages/FollowUpsScreen";
import AllInteractionsScreen from "../pages/AllInteractionsScreen";
import LoginUI from "../login/Login";
import MeetingsEdit from "../pages/MeetingsEdit";
import SiteVisitsScreen from "../pages/SiteVisitsScreen";
import AddNewInteraction from "../pages/AddNewInteraction";
import MissedFollowup from "../pages/MissedFollowup";
import UploadedLeads from "../pages/UploadedLeads";
import TotalLeadScreen from "../pages/TotalLeadScreen";
import LeadsListScreen from "../pages/LeadsListScreen";
import TotalBookingsAgreementsTillDateScreen from '../pages/TotalBookingsAgreementsTillDateScreen'
import TotalBookingsAgreementsPerMonth from '../pages/TotalBookingsAgreementsPerMonth'
import AssignRM from "../pages/AssignRM";
import ChangeRM from "../pages/ChangeRM";
import BookingDetailScreen from "../pages/BookingDetailScreen";
import LeadsassignedScreen from "../pages/LeadsassignedScreen";
import Rmform from "../pages/Rmform";
import SplashScreen from "../Layout/SplashScreen";
const Stack = createNativeStackNavigator();
export default function StackNavigations() {
  
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} > 
        {/* <Stack.Screen
          name="Splash"
          component={SplashScreen}
            options={{ headerShown: false }} 
        /> */}
        <Stack.Screen
          name="Login"
          component={LoginUI}
        />
        <Stack.Screen
          name="Dashboard"
          component={Dashboard}
        />

        <Stack.Screen
          name="FollowUpsScreen"
          component={FollowUpsScreen}
        />
        <Stack.Screen
          name="AllInteractionsScreen"
          component={AllInteractionsScreen}
        />
        <Stack.Screen
          name="MeetingsEdit"
          component={MeetingsEdit}
        />
        <Stack.Screen
          name="SiteVisitsScreen"
          component={SiteVisitsScreen}
        />
          <Stack.Screen
          name="AddNewInteraction"
          component={AddNewInteraction}
        />
           <Stack.Screen
          name="MissedFollowup"
          component={MissedFollowup}
        />
            <Stack.Screen
          name="UploadedLeads"
          component={UploadedLeads}
        />
          <Stack.Screen
          name="TotalLeadScreen"
          component={TotalLeadScreen}
        />
          <Stack.Screen
          name="LeadsListScreen"
          component={LeadsListScreen}
        />
           <Stack.Screen
          name="TotalBookingsAgreementsTillDateScreen"
          component={TotalBookingsAgreementsTillDateScreen}
        />
            <Stack.Screen
          name="TotalBookingsAgreementsPerMonth"
          component={TotalBookingsAgreementsPerMonth}
        />
       
        
          <Stack.Screen
          name="AssignRM"
          component={AssignRM}
        />
          <Stack.Screen
          name="ChangeRM"
          component={ChangeRM}
        />
           <Stack.Screen
          name="BookingDetailScreen"
          component={BookingDetailScreen}
        />
           <Stack.Screen
          name="LeadsassignedScreen"
          component={LeadsassignedScreen}
        />
           <Stack.Screen
          name="Rmform"
          component={Rmform}
        />
      </Stack.Navigator>
    </NavigationContainer>
  )
}