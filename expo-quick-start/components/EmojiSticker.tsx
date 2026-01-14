import { ImageSourcePropType, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

type Props = {
  imageSize: number;
  stickerSource: ImageSourcePropType;
  isActive?: boolean;
};

const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 440;

export default function EmojiSticker({ imageSize, stickerSource, isActive }: Props) {
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
      if (scaleImage.value !== imageSize * 2) {
        scaleImage.value = scaleImage.value * 2;
      } else {
        scaleImage.value = Math.round(scaleImage.value / 2);
      }
    });

  const imageStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(scaleImage.value),
      height: withSpring(scaleImage.value),
    };
  });

  return (
    <GestureDetector gesture={drag}>
      <Animated.View
        pointerEvents={isStickerActive ? 'auto' : 'none'}
        style={[
          styles.stickerContainer,
          containerStyle,
          { opacity: isStickerActive ? 1 : 0.6 },
        ]}
      >
        <GestureDetector gesture={doubleTap}>
          <Animated.Image
            source={stickerSource}
            resizeMode="contain"
            style={[imageStyle, { width: imageSize, height: imageSize }]}
          />
        </GestureDetector>
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
