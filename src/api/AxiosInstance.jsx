import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  // baseURL: "https://api.mokhsh.com",
  baseURL: 'https://api.mokhsh.info',
});

// Request Interceptor
api.interceptors.request.use(
  async config => {
    // Set Content-Type
    if (config.data instanceof FormData) {
      config.headers['Content-Type'] = 'multipart/form-data';
    } else if (config.data && typeof config.data === 'object') {
      config.headers['Content-Type'] = 'application/json';
    }

    // Get token from AsyncStorage
    const token = await AsyncStorage.getItem('PM_TOKEN');

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  error => {
    return Promise.reject(error);
  },
);

export default api;
