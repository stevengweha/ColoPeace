import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function HomeRedirectButton() {
  const navigation = useNavigation();

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => navigation.navigate("Home" as never)}
    >
      <Text style={styles.text}>🏠</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#E8F5E9",
  },
  text: {
    fontSize: 20,
  },
});
