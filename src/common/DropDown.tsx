import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Animated,
  Image,
} from "react-native";
import { AntDesign, Feather } from "@expo/vector-icons";
import { AppTheme } from "../constants/Colors";

interface Item {
  id: number;
  label: string;
  value: string;
  members?: number;
  image?: string;
}

interface Props {
  data: Item[];
  placeholder?: string;
  onChange?: (val: Item) => void;
  width?: number;
}

const CustomDropdown: React.FC<Props> = ({
  data,
  placeholder = "Select list",
  onChange,
  width = 150,
}) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<Item>(data[1]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  const animatedHeight = useRef(new Animated.Value(0)).current;

  const toggleDropdown = () => {
    setOpen(!open);
    Animated.timing(animatedHeight, {
      toValue: open ? 0 : 250,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const onSelect = (item: Item) => {
    setValue(item);
    setSelectedItemId(item.id);
    setOpen(false);
    Animated.timing(animatedHeight, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
    onChange?.(item);
  };

  return (
    <>
      <View style={{ width }}>
        <TouchableOpacity onPress={toggleDropdown} style={styles.dropdownBox}>
          <Image
            style={styles.householdImage}
            source={
              value
                ? value.image
                : require("@/assets/images/png/defaultImage.png")
            }
          />
          <View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 15 }}
            >
              <Text style={styles.selectedText}>
                {value ? value.label : placeholder}
              </Text>
              <AntDesign name={open ? "up" : "down"} size={18} color="#000" />
            </View>
            <Text style={styles.members}>{value ? value.members : 0} members</Text>
          </View>
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.dropdownList,
            {
              height: animatedHeight,
              position: "absolute",
              top: 55,
              left: 0,
              right: 0,
              zIndex: 9999,
              elevation: 10,
            },
          ]}
        >
          <FlatList
            data={data}
            extraData={selectedItemId}
            nestedScrollEnabled
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => {
              const isActive = selectedItemId === item.id;
              return (
                <TouchableOpacity
                  style={[
                    styles.listItem,
                    {
                      backgroundColor: isActive ? "#E8F2F6" : "#FCFBFA",
                    },
                  ]}
                  onPress={() => onSelect(item)}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      gap: 15,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 15,
                      }}
                    >
                      <Image
                        style={styles.householdImage}
                        source={
                          item.image
                            ? item.image
                            : require("@/assets/images/png/defaultImage.png")
                        }
                      />
                      <View>
                        <Text
                          style={[
                            styles.itemLabel,
                            {
                              color: isActive
                                ? AppTheme?.lightColors?.primary
                                : AppTheme?.darkColors?.black,
                            },
                          ]}
                        >
                          {item.label}
                        </Text>
                        {item.members !== undefined && (
                          <Text style={styles.members}>
                            {item.members} members
                          </Text>
                        )}
                      </View>
                    </View>

                    <TouchableOpacity>
                      <Feather
                        name="edit"
                        size={20}
                        color={AppTheme?.lightColors?.grey4}
                      />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListFooterComponent={() => (
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => console.log("Create New Household")}
              >
                <Text style={styles.createButtonText}>
                  <AntDesign
                    name="plus"
                    size={16}
                    color={AppTheme?.lightColors?.primary} /> Create New Household
                </Text>
              </TouchableOpacity>
            )}
          />
        </Animated.View>
      </View>
    </>
  );
};

export default CustomDropdown;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  householdImage: {
    width: 60,
    height: 60,
    borderRadius: 50,
  },
  dropdownBox: {
    height: 60,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 15,
  },
  selectedText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: "#000",
  },
  dropdownList: {
    marginTop: 16,
    backgroundColor: "#E8F2F6",
    borderRadius: 10,
    overflow: "hidden",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  itemLabel: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_500Medium",
  },
  members: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_400Regular",
    color: AppTheme?.lightColors?.grey4,
  },
  createButton: {
    paddingVertical: 20,
    paddingHorizontal: 12,
    backgroundColor: "#FCFBFA",
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },

  createButtonText: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_500Medium",
    color: AppTheme?.lightColors?.primary,
  },
});
