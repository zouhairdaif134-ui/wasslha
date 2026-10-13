import React from "react";
import { SafeAreaView, ScrollView, Text } from "react-native";
import { registerRootComponent } from "expo";

// Startup guard: if the app fails while loading or rendering, show the error
// on screen instead of closing silently, so it can be diagnosed on a real phone.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return React.createElement(
        SafeAreaView,
        { style: { flex: 1, padding: 16, paddingTop: 48, backgroundColor: "#fff" } },
        React.createElement(
          ScrollView,
          null,
          React.createElement(
            Text,
            { selectable: true },
            "WASSLHA render error:\n\n" + String(this.state.error && this.state.error.stack ? this.state.error.stack : this.state.error)
          )
        )
      );
    }
    return this.props.children;
  }
}

let Root;
try {
  const App = require("./App").default;
  Root = function GuardedApp() {
    return React.createElement(ErrorBoundary, null, React.createElement(App));
  };
} catch (error) {
  const message = String(error && error.stack ? error.stack : error);
  Root = function StartupError() {
    return React.createElement(
      SafeAreaView,
      { style: { flex: 1, padding: 16, paddingTop: 48, backgroundColor: "#fff" } },
      React.createElement(
        ScrollView,
        null,
        React.createElement(Text, { selectable: true }, "WASSLHA startup error:\n\n" + message)
      )
    );
  };
}

registerRootComponent(Root);
