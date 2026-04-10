import { View, Text } from 'react-native'
import React from 'react'
import Dashboard from './src/pages/Dashboard'
import FollowUpsScreen from './src/pages/FollowUpsScreen'
import StackNavigations from './src/navigations/StackNavigations'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux'
import store from './src/redux/store';
 const queryClient = new QueryClient();
export default function App() {
 
  return (
    <>
      {/* <Dashboard /> */}
      {/* <FollowUpsScreen/> */}
      <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <StackNavigations />
      </QueryClientProvider>
          </Provider>
      
    </>
  )
}