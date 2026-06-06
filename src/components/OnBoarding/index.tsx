import { ImageBackground } from "expo-image";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState } from "react";
import { View, Text, Image , TouchableOpacity } from "react-native";
import { styles } from "./style";
import { useOrientation } from "@/src/utils/useOrientation";
import { useRouter } from "expo-router";

const steps = [
  {
    title: "Welcome to SHABD KHEL",
    subtitle:
      "Clue padho, Word banao! A fun and educational Hinglish word puzzle game.",
    image: require("@/assets/images/png/onBoarding/onBoarding.png"),
  },
  {
    title: "Tap-to-Play Letter Tiles",
    subtitle:
      "No typing needed. Read the Hinglish clue and tap shuffled letters to form the correct word.",
    image: require("@/assets/images/png/onBoarding/onBoarding.png"),
  },
  {
    title: "Streaks & High Scores",
    subtitle:
      "Earn points and keep your daily streak alive! Unlock hints when you get stuck.",
    image: require("@/assets/images/png/onBoarding/onBoarding.png"),
  },
];

const OnBoarding = () => {
  const [index, setIndex] = useState(0);
  const { isPortrait, isLandscape } = useOrientation();
  const router = useRouter();

  const handleNext = () => {
    if (index < steps.length - 1) {
      setIndex(index + 1);
    } else {
      AsyncStorage.setItem("onboarding_done", "true");
      console.log("Finished!");
      router.replace("/sign-up");
    }
  };
  return (
    <ImageBackground
      source={require("@/assets/images/png/mainBg.png")}
      style={styles.background}
    >
      {isLandscape && (
        <View style={styles.landscapeAppNameContainer}>
          <Image
            source={require("@/assets/images/png/app-name.png")}
            style={styles.landscapeAppName}
            resizeMode="contain"
          />
        </View>
      )}
      <View style={isLandscape ? styles.landscapeContainer : styles.container}>
        <View style={[isPortrait ? styles.header : styles.landscapeHeader]}>
          {isPortrait && (
            <Image
              source={require("@/assets/images/png/app-name.png")}
              style={styles.appName}
              resizeMode="contain"
            />
          )}
          <View
            style={
              isLandscape
                ? styles.landscapeImageContainer
                : styles.imageContainer
            }
          >
            <Image
              source={steps[index].image}
              style={isLandscape ? styles.landscapeImage : styles.image}
              resizeMode="contain"
            />
            <Image
              source={require("@/assets/images/png/onBoarding/bottomFade.png")}
              style={styles.bottomFade}
              resizeMode="cover"
            />
          </View>

          {isPortrait && (
            <View style={styles.content}>
              <Text style={styles.title}>{steps[index].title}</Text>
              <Text style={styles.subtitle}>{steps[index].subtitle}</Text>
            </View>
          )}
        </View>

        <View style={isPortrait ? styles.footer : styles.landscapeFooter}>
          {isLandscape && (
            <View style={styles.landscapeContent}>
              <Text style={styles.landscapeTitle}>{steps[index].title}</Text>
              <Text style={styles.landscapeSubtitle}>
                {steps[index].subtitle}
              </Text>
            </View>
          )}
          <View style={styles.dotsContainer}>
            {steps.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, index === i && styles.dotActive]}
              />
            ))}
          </View>
          <View style={styles.btnContainer}>
            {index < steps.length - 1 ? (
              <TouchableOpacity
                style={styles.skipBtn}
                onPress={() => setIndex(steps.length - 1)}
              >
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 0 }} />
            )}

            <TouchableOpacity
              style={[
                styles.nextBtn,
                index === steps.length - 1 && styles.finishBtn,
              ]}
              onPress={handleNext}
            >
              <Text style={styles.nextText}>
                {index === steps.length - 1 ? "Finish" : "Next"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ImageBackground>
  );
};

export default OnBoarding;
