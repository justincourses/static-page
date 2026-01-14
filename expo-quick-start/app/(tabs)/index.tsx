import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ImageSourcePropType,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import domtoimage from 'dom-to-image';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { captureRef } from 'react-native-view-shot';

import Button from '@/components/Button';
import CircleButton from '@/components/CircleButton';
import EmojiSticker from '@/components/EmojiSticker';
import IconButton from '@/components/IconButton';
import ImageViewer from '@/components/ImageViewer';
import StickerSheet from '@/components/StickerSheet';

const PlaceholderImage = require('@/assets/images/placeholder.png');

type StickerLayer = {
  id: string;
  name: string;
  stickerId?: string;
};

type CustomSticker = {
  id: string;
  uri: string;
  label: string;
};

type StickerLibraryItem = {
  id: string;
  label: string;
  source: ImageSourcePropType;
};

type StorageMode = 'persistent' | 'session';

const BUILT_IN_STICKERS: StickerLibraryItem[] = [
  {
    id: 'builtin-react-logo',
    label: 'React',
    source: require('@/assets/images/react-logo.png'),
  },
  {
    id: 'builtin-icon',
    label: 'Expo',
    source: require('@/assets/images/icon.png'),
  },
  {
    id: 'builtin-splash',
    label: 'Splash',
    source: require('@/assets/images/splash-icon.png'),
  },
];

const STICKER_DIRECTORY = Platform.OS !== 'web' && FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}stickers/`
  : null;
const STICKER_LIBRARY_FILE = STICKER_DIRECTORY ? `${STICKER_DIRECTORY}library.json` : null;

const createId = () => {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const getFileExtension = (value?: string) => {
  if (!value) {
    return 'png';
  }

  const safeValue = value.split('?')[0];
  const segments = safeValue.split('.');
  const extension = segments.length > 1 ? segments[segments.length - 1] : 'png';
  return extension || 'png';
};

const ensureStickerDirectory = async () => {
  if (!STICKER_DIRECTORY) {
    return null;
  }

  const dirInfo = await FileSystem.getInfoAsync(STICKER_DIRECTORY);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(STICKER_DIRECTORY, { intermediates: true });
  }

  return STICKER_DIRECTORY;
};

const resolveStorageMode = async (): Promise<StorageMode> => {
  if (!STICKER_LIBRARY_FILE) {
    return 'session';
  }

  try {
    await ensureStickerDirectory();
    return 'persistent';
  } catch (error) {
    console.log(error);
    return 'session';
  }
};

const loadCustomStickers = async (storageMode: StorageMode): Promise<CustomSticker[]> => {
  if (storageMode !== 'persistent' || !STICKER_LIBRARY_FILE) {
    return [];
  }

  try {
    const fileInfo = await FileSystem.getInfoAsync(STICKER_LIBRARY_FILE);
    if (!fileInfo.exists) {
      return [];
    }

    const raw = await FileSystem.readAsStringAsync(STICKER_LIBRARY_FILE);
    const parsed = JSON.parse(raw) as CustomSticker[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item) => Boolean(item?.id && item?.uri));
  } catch (error) {
    console.log(error);
    return [];
  }
};

const saveCustomStickers = async (storageMode: StorageMode, stickers: CustomSticker[]) => {
  if (storageMode !== 'persistent' || !STICKER_LIBRARY_FILE) {
    return;
  }

  try {
    await ensureStickerDirectory();
    await FileSystem.writeAsStringAsync(STICKER_LIBRARY_FILE, JSON.stringify(stickers));
  } catch (error) {
    console.log(error);
  }
};

export default function CreateScreen() {
  const imageRef = useRef<View>(null);

  const [selectedImage, setSelectedImage] = useState<string | undefined>(undefined);
  const [showAppOptions, setShowAppOptions] = useState<boolean>(false);
  const [isLayerModalVisible, setIsLayerModalVisible] = useState<boolean>(false);
  const [layers, setLayers] = useState<StickerLayer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | undefined>(undefined);
  const [customStickers, setCustomStickers] = useState<CustomSticker[]>([]);
  const [libraryLoaded, setLibraryLoaded] = useState<boolean>(false);
  const [storageMode, setStorageMode] = useState<StorageMode>('session');
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
  const hasPermission = permissionResponse?.granted;

  const stickerLibrary = useMemo<StickerLibraryItem[]>(() => {
    return [
      ...BUILT_IN_STICKERS,
      ...customStickers.map((sticker) => ({
        id: sticker.id,
        label: sticker.label,
        source: { uri: sticker.uri },
      })),
    ];
  }, [customStickers]);

  const stickerSourceById = useMemo(() => {
    const entries = new Map<string, ImageSourcePropType>();
    stickerLibrary.forEach((sticker) => {
      entries.set(sticker.id, sticker.source);
    });
    return entries;
  }, [stickerLibrary]);
  const activeStickerId = layers.find((layer) => layer.id === activeLayerId)?.stickerId;

  useEffect(() => {
    const loadStickers = async () => {
      const mode = await resolveStorageMode();
      setStorageMode(mode);
      const storedStickers = await loadCustomStickers(mode);
      setCustomStickers(storedStickers);
      setLibraryLoaded(true);
    };

    void loadStickers();
  }, []);

  useEffect(() => {
    if (!libraryLoaded || storageMode !== 'persistent') {
      return;
    }

    void saveCustomStickers(storageMode, customStickers);
  }, [customStickers, libraryLoaded, storageMode]);

  const pickImageAsync = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      setShowAppOptions(true);
      console.log(result);
    } else {
      alert('You did not select any image.');
    }
  };

  const onReset = () => {
    setSelectedImage(undefined);
    setShowAppOptions(false);
    setLayers([]);
    setActiveLayerId(undefined);
  };

  const onOpenLayers = () => {
    setIsLayerModalVisible(true);
  };

  const onModalClose = () => {
    setIsLayerModalVisible(false);
  };

  const addLayer = () => {
    const layerId = createId();
    setLayers((prev) => [...prev, { id: layerId, name: `Layer ${prev.length + 1}` }]);
    setActiveLayerId(layerId);
  };

  const removeLayer = (layerId: string) => {
    setLayers((prev) => {
      const nextLayers = prev.filter((layer) => layer.id !== layerId);
      if (activeLayerId === layerId) {
        setActiveLayerId(nextLayers.at(-1)?.id);
      }
      return nextLayers;
    });
  };

  const assignStickerToLayer = (stickerId: string) => {
    let targetLayerId = activeLayerId;

    if (!targetLayerId) {
      targetLayerId = createId();
      setLayers((prev) => [
        ...prev,
        { id: targetLayerId, name: `Layer ${prev.length + 1}`, stickerId },
      ]);
    } else {
      setLayers((prev) =>
        prev.map((layer) =>
          layer.id === targetLayerId ? { ...layer, stickerId } : layer
        )
      );
    }

    setActiveLayerId(targetLayerId);
  };

  const addCustomSticker = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
      base64: Platform.OS === 'web',
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    const stickerId = createId();
    const extension = getFileExtension(asset.fileName ?? asset.uri).toLowerCase();
    const normalizedExtension = extension === 'jpg' ? 'jpeg' : extension;
    const label = asset.fileName
      ? asset.fileName.replace(/\.[^/.]+$/, '')
      : `Sticker ${customStickers.length + 1}`;

    try {
      let stickerUri = asset.uri;

      if (Platform.OS === 'web') {
        if (asset.base64) {
          const mimeType = asset.mimeType ?? `image/${normalizedExtension}`;
          stickerUri = `data:${mimeType};base64,${asset.base64}`;
        }
      } else if (storageMode === 'persistent') {
        const directory = await ensureStickerDirectory();
        if (!directory) {
          alert('Sticker storage is unavailable on this device.');
          return;
        }

        stickerUri = `${directory}${stickerId}.${extension}`;
        await FileSystem.copyAsync({ from: asset.uri, to: stickerUri });
      }

      const newSticker = {
        id: stickerId,
        uri: stickerUri,
        label,
      };

      setCustomStickers((prev) => [...prev, newSticker]);
      assignStickerToLayer(stickerId);
    } catch (error) {
      console.log(error);
      alert('Failed to add the sticker.');
    }
  };

  const onSaveImageAsync = async () => {
    if (Platform.OS !== 'web') {
      try {
        const localUri = await captureRef(imageRef, {
          height: 440,
          quality: 1,
        });

        await MediaLibrary.saveToLibraryAsync(localUri);
        if (localUri) {
          alert('Saved!');
        }
      } catch (error) {
        console.log(error);
      }
    } else {
      try {
        if (!imageRef.current) {
          return;
        }
        const target = imageRef.current as unknown as HTMLElement;
        const dataUrl = await domtoimage.toJpeg(target, {
          quality: 0.95,
          width: 320,
          height: 440,
        });

        const link = document.createElement('a');
        link.download = 'sticker-smash.jpeg';
        link.href = dataUrl;
        link.click();
      } catch (error) {
        console.log(error);
      }
    }
  };

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={[styles.container, styles.contentContainer]}>
        <View style={styles.imageContainer}>
          <View ref={imageRef} collapsable={false}>
            <ImageViewer imgSource={PlaceholderImage} selectedImage={selectedImage} />
            {layers.map((layer) => {
              const stickerSource = layer.stickerId
                ? stickerSourceById.get(layer.stickerId)
                : undefined;

              if (!stickerSource) {
                return null;
              }

              return (
                <EmojiSticker
                  key={layer.id}
                  imageSize={40}
                  stickerSource={stickerSource}
                />
              );
            })}
          </View>
        </View>
        {showAppOptions ? (
          <View style={styles.optionsContainer}>
            <View style={styles.optionsRow}>
              <IconButton icon="refresh" label="Reset" onPress={onReset} />
              <CircleButton onPress={onOpenLayers} />
              <IconButton icon="save-alt" label="Save" onPress={onSaveImageAsync} />
            </View>
          </View>
        ) : (
          <View style={styles.footerContainer}>
            <Button theme="primary" label="Choose a photo" onPress={pickImageAsync} />
            <Button label="Use this photo" onPress={() => setShowAppOptions(true)} />
          </View>
        )}
        <StickerSheet isVisible={isLayerModalVisible} onClose={onModalClose} title="Layers">
          <View style={styles.sheetSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Layers</Text>
              <Pressable style={styles.sectionAction} onPress={addLayer}>
                <MaterialIcons name="layers" size={18} color="#fff" />
                <Text style={styles.sectionActionLabel}>Add layer</Text>
              </Pressable>
            </View>
            {layers.length === 0 ? (
              <Text style={styles.emptyText}>No layers yet. Add one to get started.</Text>
            ) : (
              <ScrollView style={styles.layerList} contentContainerStyle={styles.layerListContent}>
                {layers.map((layer) => {
                  const stickerSource = layer.stickerId
                    ? stickerSourceById.get(layer.stickerId)
                    : undefined;

                  return (
                    <Pressable
                      key={layer.id}
                      style={[
                        styles.layerRow,
                        layer.id === activeLayerId ? styles.layerRowActive : null,
                      ]}
                      onPress={() => setActiveLayerId(layer.id)}
                    >
                      <View style={styles.layerThumbnail}>
                        {stickerSource ? (
                          <Image source={stickerSource} style={styles.layerThumbnailImage} />
                        ) : (
                          <MaterialIcons name="layers" size={20} color="#c5c8ce" />
                        )}
                      </View>
                      <View style={styles.layerInfo}>
                        <Text style={styles.layerName}>{layer.name}</Text>
                        <Text style={styles.layerMeta}>
                          {layer.stickerId ? 'Sticker assigned' : 'Choose a sticker'}
                        </Text>
                      </View>
                      <Pressable
                        onPress={(event) => {
                          event.stopPropagation();
                          removeLayer(layer.id);
                        }}
                        style={styles.layerDelete}
                      >
                        <MaterialIcons name="delete" size={20} color="#ff9a9a" />
                      </Pressable>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
          <View style={styles.sheetSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Sticker library</Text>
              <Pressable style={styles.sectionAction} onPress={addCustomSticker}>
                <MaterialIcons name="file-upload" size={18} color="#fff" />
                <Text style={styles.sectionActionLabel}>Upload</Text>
              </Pressable>
            </View>
            {storageMode === 'session' ? (
              <Text style={styles.sessionHint}>Uploads are temporary in this environment.</Text>
            ) : null}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={Platform.OS === 'web'}
              contentContainerStyle={styles.stickerList}
            >
              {stickerLibrary.map((sticker) => (
                <Pressable
                  key={sticker.id}
                  style={[
                    styles.stickerItem,
                    activeStickerId === sticker.id
                      ? styles.stickerItemActive
                      : null,
                  ]}
                  onPress={() => assignStickerToLayer(sticker.id)}
                >
                  <Image source={sticker.source} style={styles.stickerImage} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </StickerSheet>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
    alignItems: 'center',
  },
  contentContainer: {
    paddingTop: 16,
  },
  imageContainer: {
    flex: 1,
  },
  footerContainer: {
    flex: 1 / 3,
    alignItems: 'center',
  },
  optionsContainer: {
    position: 'absolute',
    bottom: 80,
  },
  optionsRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  sheetSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 14,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#3b3f46',
  },
  sectionActionLabel: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 6,
  },
  emptyText: {
    color: '#c5c8ce',
    fontSize: 12,
  },
  layerList: {
    maxHeight: 160,
  },
  layerListContent: {
    paddingBottom: 4,
  },
  layerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#2f343b',
    marginBottom: 8,
  },
  layerRowActive: {
    borderWidth: 1,
    borderColor: '#ffd33d',
  },
  layerThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#3b3f46',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  layerThumbnailImage: {
    width: 36,
    height: 36,
  },
  layerInfo: {
    flex: 1,
  },
  layerName: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 2,
  },
  layerMeta: {
    color: '#c5c8ce',
    fontSize: 12,
  },
  layerDelete: {
    padding: 6,
  },
  stickerList: {
    paddingVertical: 4,
  },
  sessionHint: {
    color: '#c5c8ce',
    fontSize: 12,
    marginBottom: 8,
  },
  stickerItem: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#3b3f46',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  stickerItemActive: {
    borderColor: '#ffd33d',
  },
  stickerImage: {
    width: 50,
    height: 50,
  },
});
