import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  Dimensions,
} from "react-native";
import { useOrientation } from "@/src/utils/useOrientation";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const OnBoarding = () => {
  const [index, setIndex] = useState(0);
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  const steps = [
    {
      id: "1",
      title: "Namaste!\nWelcome to WordWala.",
      subtitle: "The unique word puzzle game\ndesigned for India.",
      image: require("@/assets/images/new_onboarding_1.png"),
      backgroundColor: "#3FA8AA", // Teal matching the screenshot
      buttonColor: "#ff8c00", // Orange
      buttonText: "Next",
      textColor: "#0f2c2a",
    },
    {
      id: "2",
      title: "Read Hinglish\nClues.",
      subtitle: "Unscramble letters to find the\ncorrect English word.",
      image: require("@/assets/images/new_onboarding_2.png"),
      backgroundColor: "#a3eefbff", // Light blue matching screenshot
      buttonColor: "#ff8c00", // Orange
      buttonText: "Next",
      textColor: "#082025",
    },
    {
      id: "3",
      title: "Boost Your\nVocabulary.",
      subtitle: "Learn new English words daily\nwhile having fun with cultural clues.",
      image: require("@/assets/images/new_onboarding_3.png"),
      backgroundColor: "#fca148", // Orange matching screenshot
      buttonColor: "#0c7c7c", // Dark Teal
      buttonText: "Get Started",
      textColor: "#3d1f00",
    },
  ];

  const handleNext = async () => {
    if (index < steps.length - 1) {
      flatListRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      await AsyncStorage.setItem("onboarding_done", "true");
      router.replace("/sign-up");
    }
  };

  const handleSkip = () => {
    flatListRef.current?.scrollToIndex({ index: steps.length - 1, animated: true });
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems[0]) {
      setIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const insets = useSafeAreaInsets();
  const currentStep = steps[index];

  const renderItem = ({ item, index: itemIndex }: { item: any, index: number }) => {
    return (
      <View style={[styles.slide, { width: SCREEN_WIDTH, backgroundColor: item.backgroundColor }]}>

        {/* Top Header for Skip Button */}
        <View style={[styles.topHeader, { marginTop: insets.top > 0 ? insets.top : 20 }]}>
          {itemIndex < steps.length - 1 ? (
            <TouchableOpacity onPress={handleSkip}>
              <Text style={[styles.skipText, { color: item.textColor }]}>Skip</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ height: 24 }} />
          )}
        </View>

        {/* Content Wrapper */}
        <View style={styles.contentWrapper}>

          {/* Logo & Title Section */}
          <View style={styles.titleSection}>
            {itemIndex === 0 ? (
              <Text style={styles.logoText}>WORD<Text style={{ color: '#ff8c00' }}>WA</Text>LA</Text>
            ) : (
              <View style={{ height: 50 }} /> // Placeholder for spacing on other screens
            )}
            <Text style={[styles.title, { color: item.textColor }]}>{item.title}</Text>
          </View>

          {/* Image Section (Flex 1 to take remaining space) */}
          <View style={styles.imageContainer}>
            <Image
              source={item.image}
              style={styles.image}
              resizeMode="contain"
            />
          </View>

          {/* Subtitle Section */}
          <View style={styles.subtitleSection}>
            {itemIndex === 0 && <View style={[styles.divider, { backgroundColor: item.textColor }]} />}
            <Text style={[styles.subtitle, { color: item.textColor }]}>{item.subtitle}</Text>
          </View>

        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Full Screen Image Slider */}
      <FlatList
        ref={flatListRef}
        data={steps}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
      />

      {/* Absolute Footer for Buttons and Dots */}
      <View style={[styles.footer, { bottom: insets.bottom > 0 ? insets.bottom + 20 : 30 }]}>
        {/* Step indicator dots */}
        <View style={styles.dotsContainer}>
          {steps.map((_, i) => (
            <View key={i} style={[styles.dot, index === i && { backgroundColor: currentStep.textColor, opacity: 1, width: 24 }]} />
          ))}
        </View>

        {/* Navigation buttons */}
        <View style={styles.btnContainer}>
          <TouchableOpacity
            style={[
              styles.nextBtn,
              { backgroundColor: currentStep.buttonColor }
            ]}
            onPress={handleNext}
          >
            <Text style={styles.nextText}>
              {currentStep.buttonText}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    flex: 1,
  },
  topHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    paddingVertical: 10,
    zIndex: 10,
  },
  skipText: {
    fontSize: 18,
    fontWeight: "500",
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 150, // Space for the absolute footer
  },
  titleSection: {
    alignItems: "center",
    marginTop: 10,
  },
  logoText: {
    fontSize: 45,
    fontWeight: "bold",
    fontFamily: "Duplet-semibold",
    textAlign: "center",
    color: "#ffffff",
    marginBottom: 10,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    fontFamily: "Duplet-semibold",
    textAlign: "center",
    lineHeight: 40,
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 20,
    width: "100%",
  },
  image: {
    width: "150%",
    height: "150%",
  },
  subtitleSection: {
    alignItems: "center",
    minHeight: 80,
    justifyContent: "flex-start",
  },
  divider: {
    width: 40,
    height: 3,
    marginVertical: 15,
    borderRadius: 2,
    opacity: 0.5,
  },
  subtitle: {
    fontSize: 18,
    textAlign: "center",
    lineHeight: 26,
    fontWeight: "500",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  dotsContainer: {
    flexDirection: "row",
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(0,0,0,0.15)",
    marginHorizontal: 6,
  },
  btnContainer: {
    width: "100%",
    alignItems: "center",
  },
  nextBtn: {
    width: "100%",
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
  },
  nextText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
});

export default OnBoarding;
