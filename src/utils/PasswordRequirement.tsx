import { FontAwesome } from "@expo/vector-icons";
import { StyleSheet,Text ,View} from "react-native";
import { AppTheme } from "../constants/Colors";

const PasswordRequirement = ({
  met,
  text,
  active,
}: {
  met: boolean;
  text: string;
  active: boolean;
}) => {
  const iconColor = met ? "#00BA00" : active ? "#F0475C" : "#7E7E7E";
  const textColor = met ? "#7E7E7E" : active ? "#F0475C" : "#7E7E7E";

  return (
    <View style={styles.requirementRow}>
      <FontAwesome
        name={met ? "check-circle" : "circle-thin"}
        size={20}
        color={iconColor}
      />
      <Text style={[styles.requirementText, { color: textColor }]}>{text}</Text>
    </View>
  );
};
export default PasswordRequirement;


const styles = StyleSheet.create({
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  requirementText: {
    fontFamily : "PlusJakartaSans_400Regular",
    fontSize: 14,
    marginLeft: 10,
    paddingBottom : 4,
    color: AppTheme?.darkColors?.grey4,
  },
});
