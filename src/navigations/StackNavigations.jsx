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
const Stack = createNativeStackNavigator();
export default function StackNavigations() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
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
      </Stack.Navigator>
    </NavigationContainer>
  )
}