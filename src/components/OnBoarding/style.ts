import { AppTheme } from "@/src/constants/Colors";
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  container: {
    padding: 24,
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
  },
  header: {
    flex: 1,
    justifyContent: "space-evenly",
    alignItems: "center",
    width: "100%",
  },
  appName: {
    width: 200,
  },
  imageContainer: {
    width: "100%",
    height: "55%",
    overflow: "hidden",
    borderRadius: 20,
    backgroundColor: AppTheme?.lightColors?.grey0,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  bottomFade: {
    width: "100%",
    height: 100,
    position: "absolute",
    bottom: 0,
    left: 0,
  },
  content: {
    width: "100%",
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    fontFamily: "Duplet-semibold",
    textAlign: "center",
    color: AppTheme?.darkColors?.black,
  },

  subtitle: {
    fontSize: 16,
    height: 80,
    textAlign: "center",
    color: AppTheme?.lightColors?.grey5,
    marginTop: 10,
    lineHeight: 22,
    paddingHorizontal: 10,
  },

  dotsContainer: {
    flexDirection: "row",
    marginTop: 20,
    marginBottom: 30,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ccc",
    marginHorizontal: 4,
  },

  dotActive: {
    backgroundColor: "#33A3D6",
    width: 8,
  },

  footer: {
    width: "100%",
    justifyContent: "space-between",
    alignItems: "center",
  },
  btnContainer:{
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  skipBtn: {
    width: "25%",
    paddingVertical: 16,
    paddingHorizontal: 25,
    backgroundColor: "#f2f2f2",
    borderRadius: 8,
    alignItems: "center",
  },

  skipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },

  nextBtn: {
    width: "70%",
    paddingVertical: 16,
    paddingHorizontal: 30,
    backgroundColor: AppTheme?.lightColors?.primary,
    borderRadius: 8,
    alignItems: "center",
  },
  finishBtn: {
    width: "100%",
  },
  nextText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  //  Landscape view 
   landscapeContainer: {
    flexDirection: "row",
    paddingHorizontal: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  landscapeAppNameContainer:{
    width: "100%",
    marginVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  landscapeAppName:{
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  landscapeHeader: {
    flex: 1,
    height: "80%",
    justifyContent: "center",
    alignItems: "center",
  },

  landscapeImageContainer: {
    height: "100%",
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: AppTheme?.lightColors?.grey0,
  },

  landscapeImage: {
    width: "100%",
    height: "100%",
  },

  landscapeContent: {
    marginTop: 0,
    gap: 10,
  },

  landscapeTitle: {
    fontSize: 30,
    textAlign: "center",
    fontWeight: "600",
    color: AppTheme?.darkColors?.black,
  },

  landscapeSubtitle: {
    fontSize: 18,
    height: "auto",
    textAlign: "center",
    marginTop: 5,
    lineHeight: 22,
    marginBottom: 40,
  },

  landscapeFooter: {
    width: "50%",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },
});
