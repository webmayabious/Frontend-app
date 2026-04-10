import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { SafeAreaView } from "react-native-safe-area-context";

const BottomNav = () => {
  return (
    <SafeAreaView edges={["bottom"]}>
      <View style={styles.bottomNav}>
        <NavItem icon="forum" label="Discussions" />
        <NavItem icon="fingerprint" label="Attendance" />
        <NavItem icon="chat" label="Chat" />
        <NavItem icon="notifications" label="Notifications" />
      </View>
    </SafeAreaView>
  );
};

const NavItem = ({ icon, label }) => (
  <TouchableOpacity style={styles.navItem}>
    <Icon name={icon} size={20} color="#cfd8dc" />
    <Text style={styles.navText}>{label}</Text>
  </TouchableOpacity>
);

export default BottomNav;

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    paddingBottom: 20,
    backgroundColor: "#2B2E81",
  },

  navItem: {
    alignItems: "center",
  },

  navText: {
    color: "#cfd8dc",
    fontSize: 10,
    marginTop: 3,
  },
});