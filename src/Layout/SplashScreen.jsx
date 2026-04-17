import React from 'react';
import { StyleSheet, ImageBackground } from 'react-native';

const SplashScreen = () => {
  return (
    <ImageBackground
      source={require('../asset/image/splashscreen.png')}
      style={styles.background}
      resizeMode="cover"
    />
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
});