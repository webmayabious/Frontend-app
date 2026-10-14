import React from 'react';
import { StyleSheet, ImageBackground } from 'react-native';

const defaultImage = require('../asset/image/splashscreen1.jpg');

const SplashScreen = ({ image = defaultImage }) => {
  return (
    <ImageBackground
      source={image}
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