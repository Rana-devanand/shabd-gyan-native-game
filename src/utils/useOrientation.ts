import { useWindowDimensions } from "react-native";

export const useOrientation = () => {
  const { width, height } = useWindowDimensions();

  return {
    width,
    height,
    isPortrait: height >= width,
    isLandscape: width > height,
  };
};
