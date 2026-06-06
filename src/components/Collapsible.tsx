import { PropsWithChildren, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import Text from '@/src/components/ThemedText';
import View from '@/src/components/ThemedView';
import { IconSymbol } from '@/src/components/ui/IconSymbol';
import { useTheme, useThemeMode } from '@rneui/themed';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { theme } = useTheme();
  const { mode } = useThemeMode();

  return (
    <View>
      <TouchableOpacity
        style={styles.heading}
        onPress={() => setIsOpen((value) => !value)}
        activeOpacity={0.8}>
        <IconSymbol
          name="chevron.right"
          size={18}
          weight="medium"
          color={mode === 'light' ? theme.colors.black : theme.colors.white}
          style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
        />

        <Text type="defaultSemiBold">{title}</Text>
      </TouchableOpacity>
      {isOpen && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  content: {
    marginTop: 6,
    marginLeft: 24,
  },
});
