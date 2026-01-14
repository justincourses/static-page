import { Platform, StyleSheet, View } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Collapsible } from '@/components/ui/collapsible';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';

const HEADER_ICON_SIZE = 310;

export default function TabTwoScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <View style={styles.headerImageContainer}>
          <IconSymbol
            size={HEADER_ICON_SIZE}
            color="#808080"
            name="chevron.left.forwardslash.chevron.right"
            style={styles.headerImage}
          />
        </View>
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText
          type="title"
          style={{
            fontFamily: Fonts.rounded,
          }}>
          Guide
        </ThemedText>
      </ThemedView>
      <ThemedText>Make a sticker image in a few quick steps.</ThemedText>
      <Collapsible title="Pick a photo">
        <ThemedText>
          Tap <ThemedText type="defaultSemiBold">Choose a photo</ThemedText> to select one from your
          library. If you just want to try the flow, tap{' '}
          <ThemedText type="defaultSemiBold">Use this photo</ThemedText> to start with the
          placeholder. Allow photo access when prompted.
        </ThemedText>
      </Collapsible>
      <Collapsible title="Add a sticker">
        <ThemedText>
          Tap the <ThemedText type="defaultSemiBold">+</ThemedText> button to open the emoji picker,
          then choose an emoji to place it on the photo. Drag it to reposition and double-tap to
          resize. Picking another emoji replaces the current sticker.
        </ThemedText>
      </Collapsible>
      <Collapsible title="Save or reset">
        <ThemedText>
          Tap <ThemedText type="defaultSemiBold">Save</ThemedText> to export your image. On
          iOS/Android it saves to your photo library, and on the web it downloads a JPEG. Use{' '}
          <ThemedText type="defaultSemiBold">Reset</ThemedText> to start over.
        </ThemedText>
      </Collapsible>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImageContainer: {
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  headerImage: Platform.select({
    web: {
      lineHeight: HEADER_ICON_SIZE,
    },
    default: {},
  }),
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
});
