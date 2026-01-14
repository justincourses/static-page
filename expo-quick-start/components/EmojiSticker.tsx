import { ImageSourcePropType, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

type Props = {
  imageSize: number;
  stickerSource: ImageSourcePropType;
  isActive?: boolean;
  onSelect?: () => void;
};

const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 440;

export default function EmojiSticker({
  imageSize,
  stickerSource,
  isActive,
  onSelect,
}: Props) {
  const isStickerActive = isActive ?? true;
  const scaleImage = useSharedValue(imageSize);
  const translateX = useSharedValue((CANVAS_WIDTH - imageSize) / 2);
  const translateY = useSharedValue((CANVAS_HEIGHT - imageSize) / 2);

  const drag = Gesture.Pan()
    .enabled(isStickerActive)
    .onChange((event) => {
      translateX.value += event.changeX;
      translateY.value += event.changeY;
    });

  const containerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: translateX.value,
        },
        {
          translateY: translateY.value,
        },
      ],
    };
  });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .enabled(isStickerActive)
    .onStart(() => {
      if (onSelect) {
        runOnJS(onSelect)();
      }
      if (scaleImage.value !== imageSize * 2) {
        scaleImage.value = scaleImage.value * 2;
      } else {
        scaleImage.value = Math.round(scaleImage.value / 2);
      }
    });

  const selectTap = Gesture.Tap().onEnd(() => {
    if (onSelect) {
      runOnJS(onSelect)();
    }
  });

  const composedGesture = Gesture.Simultaneous(
    drag,
    Gesture.Exclusive(doubleTap, selectTap)
  );

  const imageStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(scaleImage.value),
      height: withSpring(scaleImage.value),
    };
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.stickerContainer, containerStyle]}>
        <Animated.Image
          source={stickerSource}
          resizeMode="contain"
          style={[imageStyle, { width: imageSize, height: imageSize }]}
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  stickerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
