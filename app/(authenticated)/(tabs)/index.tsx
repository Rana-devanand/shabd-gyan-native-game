import Dashboard from "@/src/screens/Home";
import React from "react";
import { PaperProvider } from "react-native-paper";

const index = () => {
  return (
    <PaperProvider>
      <Dashboard />
    </PaperProvider>
  );
};

export default index;
