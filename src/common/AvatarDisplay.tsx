import React from "react";
import { Text, Image, StyleSheet, StyleProp, TextStyle, ImageStyle } from "react-native";

// Local avatars from assets/avatar
const BOY_IMAGE = require("../../assets/avatar/boy.jpg");
const GIRL_IMAGE = require("../../assets/avatar/girl.jpg");

interface AvatarDisplayProps {
  avatar: string;
  size?: number;
  textStyle?: StyleProp<TextStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}

export default function AvatarDisplay({
  avatar,
  size = 48,
  textStyle,
  imageStyle,
}: AvatarDisplayProps) {
  if (avatar === "boy") {
    return (
      <Image
        source={BOY_IMAGE}
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          imageStyle,
        ]}
        resizeMode="cover"
      />
    );
  }

  if (avatar === "girl") {
    return (
      <Image
        source={GIRL_IMAGE}
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          imageStyle,
        ]}
        resizeMode="cover"
      />
    );
  }

  // Fallback to emoji rendering if database stores emoji
  return (
    <Text
      style={[
        {
          fontSize: size * 0.6,
          textAlign: "center",
          lineHeight: size,
        },
        textStyle,
      ]}
    >
      {avatar || "🧔🏽‍♂️"}
    </Text>
  );
}
