import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";

type State = { hasError: boolean; error?: any };

export default class ErrorBoundary extends React.Component<{}, State> {
  constructor(props: {}) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    console.error("ErrorBoundary caught:", error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined });
    // tentative de reload : utile pour web / dev
    try {
      // @ts-ignore
      if (global?.location?.reload) global.location.reload();
    } catch {}
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Une erreur est survenue</Text>
          <Text style={styles.msg}>{String(this.state.error)}</Text>
          <Button title="Réessayer / Recharger" onPress={this.reset} />
        </View>
      );
    }
    // @ts-ignore
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
  msg: { color: "#666", marginBottom: 12, textAlign: "center" }
});
